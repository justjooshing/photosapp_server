import { Router } from "express";
import { checkJWT } from "../../services/auth/auth.ts";
import {
  addFreshBaseUrls,
  getDayAndMonthImages,
  fetchLatestImages,
  handleSortOrDeletePhotos,
  selectDayAndMonthImages,
  shapeImagesResponse,
  updateImagesDB,
} from "../middlewares/images/images.ts";
import { getUserData, updateUsersDB } from "../middlewares/user/user.ts";

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
    getDayAndMonthImages,
    updateImagesDB,
    selectDayAndMonthImages,
    addFreshBaseUrls,
    shapeImagesResponse
  );
  route.post("/", handleSortOrDeletePhotos);
};
