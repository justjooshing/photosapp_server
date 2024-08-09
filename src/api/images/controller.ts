import { Request, Response } from "express";
import {
  checkValidBaseUrl,
  findImage,
  getSortCounts,
  sortImageSet,
  updateImagesByChoice,
} from "@/api/images/services/images.js";
import { handleError } from "@/api/utils/index.js";
import { getOrCreateCurrentAlbum } from "@/api/albums/services/albums.js";
import { SchemaImages } from "@/api/images/services/types.js";
import { prisma } from "@/loaders/prisma.js";
import { queryByImageType } from "@/api/images/services/queries.js";
import { ImageType, SortOptions } from "@/api/images/types.js";

export const ImagesController = Object.freeze({
  getImagesByType: async (
    req: Request & { query: { type: ImageType } },
    res: Response,
  ) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;

      const images = await queryByImageType(req.query.type, userId);
      const withUrls = await checkValidBaseUrl(access_token, images);

      return res.status(200).json(withUrls);
    } catch (err) {
      handleError({
        error: { from: "Getting images", err },
        res,
        callback: () => res.status(500).end(),
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
        if (Object.values(SortOptions).includes(body.sorted_status)) {
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
