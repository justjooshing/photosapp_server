import { Router } from "express";
import { ImagesController } from "../controllers/images.ts";

const route = Router();

export const images = (app: Router) => {
  app.use("/images", route);
  route.get("/", ImagesController.getImagesByType);
  route.post("/", ImagesController.handleSortOrDeletePhotos);
};
