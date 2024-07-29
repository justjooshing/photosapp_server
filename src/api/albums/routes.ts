import { Router } from "express";
import { AlbumController } from "./controller.js";

export const albums = (app: Router) => {
  const route = Router();

  route.get("/", AlbumController.getAlbumWithFirstImages);
  route.get("/:albumId", AlbumController.getImagesFromSpecificAlbum);

  app.use("/albums", route);
};