import { NextFunction, Request, Response } from "express";
import {
  findAlbums,
  selectAlbum,
  updateWithFirstImage,
} from "@/api/albums/services/albums.js";
import { checkValidBaseUrl } from "@/api/images/services/images.js";
import { SortOptions } from "@/api/images/types.js";
import createHttpError from "http-errors";

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
});
