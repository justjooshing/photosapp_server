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
import { ApiImages } from "@/api/images/services/types.js";
import { prisma } from "@/loaders/prisma.js";
import { queryByImageType } from "@/api/images/services/queries.js";
import { ImageType } from "@/api/images/types.js";

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
      });
    }
  },
  handleUpdateSingleImage: async (
    req: Request & {
      body: { sorted_status: ApiImages["sorted_status"] };
      params: { imageId: string };
    },
    res: Response,
  ) => {
    const {
      locals: { appUser, access_token },
      body: { sorted_status },
      params: { imageId },
    } = req;
    try {
      const currentImage = await findImage(appUser.id, Number(imageId));
      if (!currentImage) {
        return res.status(404).end();
      }

      const currentAlbum = await getOrCreateCurrentAlbum(
        appUser.id,
        currentImage,
      );

      await sortImageSet(appUser.id, currentImage);
      const updatedImage = await updateImagesByChoice(
        currentAlbum.id,
        sorted_status,
        currentImage.id,
      );

      const freshUrlImage = await checkValidBaseUrl(access_token, [
        updatedImage,
      ]);

      return res.status(200).json({ image: freshUrlImage });
    } catch (err) {
      handleError({
        error: { from: "Updating image", err },
        res,
      });
    }
  },
  checkGoogleImageStatus: async (
    req: Request & { params: { imageId: string } },
    res: Response,
  ) => {
    const {
      locals: { appUser, access_token },
      params: { imageId },
    } = req;

    try {
      const currentImage = await findImage(appUser.id, Number(imageId));
      if (!currentImage) {
        return res.status(404).end();
      }

      const updatedImage = await prisma.images.update({
        where: {
          id: currentImage.id,
          userId: appUser.id,
        },
        data: { baseUrl: null },
      });

      const freshUrlImage = await checkValidBaseUrl(access_token, [
        updatedImage,
      ]);
      return res.status(200).json({ image: freshUrlImage });
    } catch (err) {
      handleError({
        error: { from: "Checking single image on google", err },
        res,
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
      });
    }
  },
});
