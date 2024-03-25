import { Router } from "express";
import { getUserData } from "../middlewares/user/index.ts";
import { checkJWT } from "../middlewares/auth/index.ts";
import { ImagesController } from "../controllers/images.ts";

const route = Router();

export const images = (app: Router) => {
  app.use("/images", route);
  route.use(checkJWT, getUserData);
  route.get("/", ImagesController.getImagesByType);
  route.post("/", ImagesController.handleSortOrDeletePhotos);
};
