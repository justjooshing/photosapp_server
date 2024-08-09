import { zAlbumParams, zSingleAlbumId } from "./validation.js";
import { handleError } from "@/api/utils/index.js";
import { NextFunction, Request, Response } from "express";

export const validateSingleAlbum = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    zSingleAlbumId.parse({ albumId: req.params.albumId });
    next();
  } catch (err) {
    handleError({
      error: { from: "validateSingleAlbum", err },
      res,
    });
  }
};

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
    });
  }
};
