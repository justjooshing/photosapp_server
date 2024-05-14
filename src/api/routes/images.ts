import { Router } from "express";
import { ImagesController } from "@/controllers/images.js";
import { validateUpdateSingleImage } from "@/middlewares/images/index.js";

const route = Router();

export const images = (app: Router) => {
  app.use("/images", route);
  route.get("/", ImagesController.getImagesByType);
  route.get("/count", ImagesController.getSortCounts);
  route.put(
    "/:imageId",
    validateUpdateSingleImage,
    ImagesController.handleUpdateSingleImage,
  );
};
