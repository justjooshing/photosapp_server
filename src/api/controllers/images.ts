import { Request, Response } from "express";
import {
  checkValidBaseUrl,
  findImage,
  getSortCounts,
  sortImageSet,
  updateImagesByChoice,
} from "@/services/images/images.js";
import { handleError } from "@/utils/index.js";
import { getOrCreateCurrentAlbum } from "@/services/albums/albums.js";
import { ImageType, SchemaImages } from "@/services/images/types.js";
import { prisma } from "../../loaders/prisma.js";
import { queryByImageType } from "@/services/images/queries.js";
import { deprecated_getSortCounts } from "@/services/images/deprecated/v0/index.js";

export const ImagesController = Object.freeze({
  getImagesByType: async (req: Request, res: Response) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;
      const { type }: { type?: ImageType } = req.query;

      const filterOptions = ["today", "similar", "oldest"];
      if (typeof type !== "string" || !filterOptions.includes(type)) {
        return res.send(400).json({ message: "Invalid type param" });
      }
      const images = await queryByImageType(type, userId);
      const withUrls = await checkValidBaseUrl(access_token, images);

      return res.status(200).json(withUrls);
    } catch (err) {
      handleError({
        error: { from: "Getting images", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error getting images" }),
      });
    }
  },
  handleUpdateSingleImage: async (req: Request, res: Response) => {
    const {
      locals: { appUser, access_token },
      body,
      params: { imageId },
    } = req;

    const currentImage = await findImage(appUser.id, Number(imageId));
    if (!currentImage) {
      return res.status(404).json({ message: "Image not found" });
    }

    try {
      const currentAlbum = await getOrCreateCurrentAlbum(
        appUser.id,
        currentImage,
      );

      const updatedImage = await (async (): Promise<SchemaImages> => {
        if (!body) return currentImage;
        if (body.sorted_status === "keep" || body.sorted_status === "delete") {
          await sortImageSet(appUser.id, currentImage);
          return await updateImagesByChoice(
            currentAlbum.id,
            body.sorted_status,
            currentImage.id,
          );
        } else {
          return await prisma.images.update({
            where: {
              id: currentImage.id,
              userId: appUser.id,
            },
            data: body,
          });
        }
      })();

      const freshUrlImage = await checkValidBaseUrl(access_token, [
        updatedImage,
      ]);

      return res.status(200).json({ image: freshUrlImage });
    } catch (err) {
      handleError({
        error: { from: "Updating image", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error updating image" }),
      });
    }
  },
  getSortCounts: async (req: Request, res: Response) => {
    try {
      const version = req.header("app-version");
      console.log({ version });
      if (!version) {
        // update to 'if deprecatedVersions.keys.includes(version)
        // lookup version
        const counts = await deprecated_getSortCounts(req.locals.appUser.id);
        return res.status(200).json({ counts });
      }
      const counts = await getSortCounts(req.locals.appUser.id);
      return res.status(200).json(counts);
    } catch (err) {
      handleError({
        error: { from: "Counts", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error fetching counts" }),
      });
    }
  },
});
