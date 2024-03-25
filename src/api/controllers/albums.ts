import { Request, Response } from "express";
import {
  appendImagesWithFreshUrls,
  findAlbums,
  findFirstImagesOfAlbums,
} from "../services/albums/albums.ts";

export const AlbumController = Object.freeze({
  returnAlbumWithFirstImages: async (req: Request, res: Response) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;

      const albums = await findAlbums(userId);

      if (!albums.length) {
        return res.send(200).json({ albums: [] });
      }

      const firstImages = await findFirstImagesOfAlbums(albums);

      if (!!firstImages.size) {
        const data = await appendImagesWithFreshUrls(
          access_token,
          firstImages,
          albums
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
      console.error("returning albums", err);
      res.status(400).send(err);
    }
  },
});
