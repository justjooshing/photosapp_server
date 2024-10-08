import { NextFunction, Request, Response } from "express";
import {
  findAlbums,
  selectAlbum,
  updateWithFirstImage,
} from "@/api/albums/services/albums.js";
import { SortOptions } from "@/api/images/types.js";
import createHttpError from "http-errors";
import { checkValidBaseUrl } from "../images/helpers.js";
import { SkipOptions } from "./types.js";
import { prisma } from "@/loaders/prisma.js";

export const AlbumController = Object.freeze({
  getAlbumWithFirstImages: async (
    req: Request & {
      query: { sorted_status: SortOptions; lastAlbumId: string };
    },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const albums = await findAlbums(
        req.locals.appUser.id,
        req.query.sorted_status,
        Number(req.query.lastAlbumId),
      );

      if (!albums.length) {
        return res.status(200).json({ albums: [] });
      }

      const data = await updateWithFirstImage(albums, req.locals.access_token);

      return res.json({ albums: data });
    } catch (err) {
      next(err);
    }
  },
  getImagesFromSpecificAlbum: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { appUser, access_token } = req.locals;

      const albumDetails = await selectAlbum(
        appUser.id,
        Number(req.params.albumId),
      );
      if (!albumDetails) {
        throw createHttpError(404, "Album not found");
      }

      const freshUrlImages = await checkValidBaseUrl(
        access_token,
        albumDetails.images,
      );

      return res
        .status(200)
        .json({ title: albumDetails.title, images: freshUrlImages });
    } catch (err) {
      next(err);
    }
  },
  skipAlbum: async (
    req: Request & {
      body: { skip_reason: SkipOptions; first_image_id: number };
    },
    res: Response,
    next: NextFunction,
  ) => {
    try {
      // Find the image_set that they've skipped
      const imageSet = await prisma.image_sets.findFirst({
        where: {
          images: {
            some: {
              id: req.body.first_image_id,
            },
          },
        },
      });
      if (!imageSet?.id) throw createHttpError(404, "Image set not found");

      await prisma.image_sets.update({
        where: {
          id: imageSet.id,
        },
        data: {
          skip_reason: req.body.skip_reason.toUpperCase(),
        },
      });
      res.status(200).end();
    } catch (err) {
      next(err);
    }
  },
});
