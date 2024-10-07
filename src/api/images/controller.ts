import { NextFunction, Request, Response } from "express";
import {
  findImage,
  getSortCounts,
  sortImageSet,
  updateImagesByChoice,
} from "@/api/images/services/images.js";
import { getOrCreateCurrentAlbum } from "@/api/albums/services/albums.js";
import { ApiImages } from "@/api/images/services/types.js";
import { prisma } from "@/loaders/prisma.js";
import { ImageType } from "@/api/images/types.js";
import createHttpError from "http-errors";
import {
  checkValidBaseUrl,
  fetchAllImages,
  queryByImageType,
} from "./helpers.js";
import { splitDateString_DateOnly } from "../utils/index.js";
import {
  getAllImagesLastUpdated,
  updateAllImagesLastUpdated,
} from "../user/services/user.js";

export const ImagesController = Object.freeze({
  refetchImages: async (req: Request, res: Response, next: NextFunction) => {
    console.log("Forcing refetch");
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;

      const lastRefetchDate = await getAllImagesLastUpdated(userId);

      const lastAllUpdated = splitDateString_DateOnly(lastRefetchDate);
      const currentDate = splitDateString_DateOnly(new Date());

      if (lastAllUpdated < currentDate) {
        await fetchAllImages({
          access_token,
          userId,
          bodyParams: {},
        });

        await updateAllImagesLastUpdated(userId);

        res.status(204).end();
      }
    } catch (err) {
      next(err);
    }
  },
  getImagesByType: async (
    req: Request & { query: { type: ImageType } },
    res: Response,
    next: NextFunction,
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
      next(err);
    }
  },
  handleUpdateSingleImage: async (
    req: Request & {
      body: { sorted_status: ApiImages["sorted_status"] };
      params: { imageId: string };
    },
    res: Response,
    next: NextFunction,
  ) => {
    const {
      locals: { appUser, access_token },
      body: { sorted_status },
      params: { imageId },
    } = req;
    try {
      const currentImage = await findImage(appUser.id, Number(imageId));
      if (!currentImage) {
        throw createHttpError(404, "No image found to update");
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
      next(err);
    }
  },
  checkGoogleImageStatus: async (
    req: Request & { params: { imageId: string } },
    res: Response,
    next: NextFunction,
  ) => {
    const {
      locals: { appUser, access_token },
      params: { imageId },
    } = req;

    try {
      const currentImage = await findImage(appUser.id, Number(imageId));
      if (!currentImage) {
        throw createHttpError(404, "Image not found");
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
      next(err);
    }
  },
  getSortCounts: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const counts = await getSortCounts(req.locals.appUser.id);
      return res.status(200).json(counts);
    } catch (err) {
      next(err);
    }
  },
});
