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
import { returnAlbumsWithFirstImages } from "../middlewares/albums/albums.ts";

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

  route.get("/", selectImagesByType, (req, res) => {
    const { selectedImages } = req.locals;
    res.json({ imageUrls: selectedImages });
  });

  route.post("/", appendCurrentAlbum, handleSortOrDeletePhotos);
  route.get("/albums", returnAlbumsWithFirstImages);
  route.get("/albums/:albumId", () => {
    // get specific album + all images
  });

  route.get("/count", () => {
    // send back count
  });
};
