import { Request, Response } from "express";
import {
  appendImagesWithFreshUrls,
  findAlbums,
  findFirstImagesOfAlbums,
  selectAlbum,
  selectAlbumImages,
} from "@/services/albums/albums.js";
import { checkValidBaseUrl } from "@/services/images/images.js";
import { handleError } from "@/utils/index.js";

export const AlbumController = Object.freeze({
  returnAlbumWithFirstImages: async (req: Request, res: Response) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;

      const albums = await findAlbums(userId);

      if (!albums.length) {
        return res.status(200).json({ albums: [] });
      }

      const firstImages = await findFirstImagesOfAlbums(albums);

      if (firstImages.size) {
        const data = await appendImagesWithFreshUrls(
          access_token,
          firstImages,
          albums,
        );

        res.json({ albums: data });
      } else {
        res.json({
          albums: {
            ...albums,
            firstImage: undefined,
          },
        });
      }
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
