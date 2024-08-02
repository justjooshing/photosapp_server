import { Request, Response } from "express";
import {
  appendImagesWithFreshUrls,
  findAlbums,
  findFirstImagesOfAlbums,
  selectAlbum,
  selectAlbumImages,
} from "@/api/albums/services/albums.js";
import { checkValidBaseUrl } from "@/api/images/services/images.js";
import { handleError } from "@/api/utils/index.js";
import { ApiAlbumWithFirstImage } from "@/api/albums/services/types.js";
import { deprecated_findAlbums } from "./services/deprecated/v0/index.js";
import { SortOptions } from "@/api/images/types.js";

export const AlbumController = Object.freeze({
  getAlbumWithFirstImages: async (
    req: Request & {
      query: { sorted_status: SortOptions; lastAlbumId: string };
    },
    res: Response,
  ) => {
    try {
      const albums =
        req.locals.app_version < 12
          ? await deprecated_findAlbums(req.locals.appUser.id)
          : await findAlbums(
              req.locals.appUser.id,
              req.query.sorted_status,
              Number(req.query.lastAlbumId),
            );

      if (!albums.length) {
        return res.status(200).json({ albums: [] });
      }

      const firstImages = await findFirstImagesOfAlbums(albums);

      const data: ApiAlbumWithFirstImage[] = firstImages.size
        ? await appendImagesWithFreshUrls(
            req.locals.access_token,
            firstImages,
            albums,
          )
        : albums.map((album) => ({
            ...album,
            firstImage: undefined,
          }));
      return res.json({ albums: data });
    } catch (err) {
      handleError({
        error: { from: "fetching albums", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error fetching albums" }),
      });
    }
  },
  getImagesFromSpecificAlbum: async (req: Request, res: Response) => {
    try {
      const { albumId } = req.params;
      const { appUser, access_token } = req.locals;

      const numAlbumId = Number(albumId);
      const albumDetails = await selectAlbum(appUser.id, numAlbumId);
      const images = await selectAlbumImages(appUser.id, numAlbumId);
      const freshUrlImages = await checkValidBaseUrl(access_token, images);
      res
        .status(200)
        .json({ title: albumDetails?.title, images: freshUrlImages });
    } catch (err) {
      handleError({
        error: { from: "Images in specific album", err },
        res,
        callback: () => {
          res.status(500).json({ message: "Image fetching issue" });
        },
      });
    }
  },
});
