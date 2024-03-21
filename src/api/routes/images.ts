import { Router } from "express";
import {
  addFreshBaseUrls,
  appendCurrentAlbum,
  fetchLatestImages,
  handleSortOrDeletePhotos,
  selectImagesByType,
  shapeImagesResponse,
  updateImagesDB,
} from "../middlewares/images/images.ts";
import { getUserData, updateUsersDB } from "../middlewares/user/user.ts";
import { checkJWT } from "../middlewares/auth/auth.ts";

const route = Router();

export const images = (app: Router) => {
  app.use("/images", route);

  route.use(
    checkJWT,
    getUserData,
    updateUsersDB,
    fetchLatestImages,
    updateImagesDB
  );

  route.get(
    "/",
    (req, res, next) => {
      console.log(req.originalUrl);
      next();
    },
    selectImagesByType,
    addFreshBaseUrls,
    shapeImagesResponse
  );

  route.post("/", appendCurrentAlbum, handleSortOrDeletePhotos);
};
