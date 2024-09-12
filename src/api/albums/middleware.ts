import { zAlbumParams, zSingleAlbumId } from "./validation.js";
import { RequestHandler } from "express";

export const validateSingleAlbum: RequestHandler = (req, res, next) => {
  try {
    zSingleAlbumId.parse({ albumId: req.params.albumId });
    next();
  } catch (err) {
    next(err);
  }
};

export const validateGetAlbums: RequestHandler = (req, res, next) => {
  try {
    zAlbumParams.parse(req.query);
    next();
  } catch (err) {
    next(err);
  }
};
