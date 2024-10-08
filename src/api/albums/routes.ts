import { Router } from "express";
import { AlbumController } from "./controller.js";
import {
  validateGetAlbums,
  validateSingleAlbum,
  validateSkipAlbum,
} from "./middleware.js";

export const albums = (app: Router) => {
  const route = Router();

  route.get("/", validateGetAlbums, AlbumController.getAlbumWithFirstImages);
  route.post("/skip", validateSkipAlbum, AlbumController.skipAlbum);
  route.get(
    "/:albumId",
    validateSingleAlbum,
    AlbumController.getImagesFromSpecificAlbum,
  );

  app.use("/albums", route);
};
