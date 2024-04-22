import { Router } from "express";
import { ImagesController } from "@/controllers/images.ts";
import { validateUpdateSingleImage } from "@/middlewares/images/index.ts";

const route = Router();

export const images = (app: Router) => {
  app.use("/images", route);
  route.get("/", ImagesController.getImagesByType);
  route.put(
    "/:imageId",
    validateUpdateSingleImage,
    ImagesController.handleUpdateSingleImage,
  );
};
