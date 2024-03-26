import { Request, Response } from "express";
import {
  addFreshBaseUrls,
  selectImagesByImageType,
  updateImagesByChoice,
} from "../services/images/images.ts";
import { handleError } from "../utils/index.ts";

export const ImagesController = Object.freeze({
  getImagesByType: async (req: Request, res: Response) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;
      const { type } = req.query;

      if (type !== "today" && type !== "similar") {
        return res.send(400).json({ message: "Invalid type param" });
      }
      const images = await selectImagesByImageType(type, userId);
      const withUrls = await addFreshBaseUrls(access_token, images);
      return res.status(200).json({ imageUrls: withUrls });
    } catch (err) {
      return handleError({
        error: { from: "Getting images", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error getting images" }),
      });
    }
  },
  handleSortOrDeletePhotos: async (req: Request, res: Response) => {
    if (
      !req.body?.image ||
      !req.body?.choice ||
      (req.body.choice !== "keep" && req.body.choice !== "delete")
    ) {
      return res.status(400).json({ message: "Missing required body" });
    }

    const {
      locals: { appUser },
      body: { choice, image },
    } = req;

    try {
      await updateImagesByChoice(appUser.id, choice, image.id);
      // Should I return the image
      res.status(204).end();
    } catch (err) {
      return handleError({
        error: { from: "Updating image", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error sorting image" }),
      });
    }
  },
});
