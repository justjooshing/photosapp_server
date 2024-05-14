import { Router } from "express";
import { ImagesController } from "@/controllers/images.js";
import { validateUpdateSingleImage } from "@/middlewares/images/index.js";

export const images = (app: Router) => {
  const route = Router();

  route.get("/", ImagesController.getImagesByType);
  route.get("/count", ImagesController.getSortCounts);
  route.put(
    "/:imageId",
    validateUpdateSingleImage,
    ImagesController.handleUpdateSingleImage,
  );

  app.use("/images", route);
};
