import { Router } from "express";
import { AlbumController } from "../controllers/albums.ts";

const route = Router();

export const albums = (app: Router) => {
  app.use("/albums", route);
  route.get("/", AlbumController.returnAlbumWithFirstImages);
  route.get("/:albumId", () => {
    // get specific album + all images
  });
};
