import { zAlbumParams, zSingleAlbumId, zSkipAlbum } from "./validation.js";
import { RequestHandler } from "express";

export const validateSingleAlbum: RequestHandler = (req, res, next) => {
  zSingleAlbumId.parse({ albumId: req.params.albumId });
  next();
};

export const validateGetAlbums: RequestHandler = (req, res, next) => {
  zAlbumParams.parse(req.query);
  next();
};

export const validateSkipAlbum: RequestHandler = (req, res, next) => {
  zSkipAlbum.parse(req.body);
  next();
};
