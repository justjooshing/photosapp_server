import { zAlbumParams } from "./validation.js";
import { handleError } from "@/api/utils/index.js";
import { NextFunction, Request, Response } from "express";

export const validateGetAlbums = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    zAlbumParams.parse(req.query);
    next();
  } catch (err) {
    return handleError({
      error: { from: "validateGetAlbums", err },
      res,
      callback: () => {
        res.status(400).json({ message: "Invalid properties" });
      },
    });
  }
};
