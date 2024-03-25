import { Request, Response } from "express";
import {
  addFreshBaseUrls,
  selectImagesByType,
  updateImagesByChoice,
} from "../services/images/images.ts";

export const ImagesController = Object.freeze({
  getImagesByType: async (req: Request, res: Response) => {
    try {
      const {
        access_token,
        appUser: { id: userId },
      } = req.locals;

      // Add better guard based on TS ImageType
      if (req.query.type === "today" || req.query.type === "similar") {
        const images = await selectImagesByType(req.query.type, userId);
        const withUrls = await addFreshBaseUrls(access_token, images);
        return res.status(200).json({ imageUrls: withUrls });
      }
      return res.status(400).send("Invalid type param");
    } catch (err) {
      res.status(400).send(err);
    }
  },
  handleSortOrDeletePhotos: async (req: Request, res: Response) => {
    if (
      !req.body?.image ||
      !req.body?.choice ||
      req.body.choice !== "keep" ||
      req.body.choice !== "delete"
    ) {
      return res.status(400).send("Missing required body");
    }

    const {
      locals: { appUser },
      body: { choice, image },
    } = req;

    try {
      await updateImagesByChoice(appUser.id, choice, image.id);
      res.status(201).json({});
    } catch (err) {
      console.log("Update image ERR", err);
      res.status(500).send("Error sorting image ");
    }
  },
});
