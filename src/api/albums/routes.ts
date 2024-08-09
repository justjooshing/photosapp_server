import { Router } from "express";
import { AlbumController } from "./controller.js";
import { validateGetAlbums, validateSingleAlbum } from "./middleware.js";

export const albums = (app: Router) => {
  const route = Router();

  route.get("/", validateGetAlbums, AlbumController.getAlbumWithFirstImages);
  route.get(
    "/:albumId",
    validateSingleAlbum,
    AlbumController.getImagesFromSpecificAlbum,
  );

  app.use("/albums", route);
};
