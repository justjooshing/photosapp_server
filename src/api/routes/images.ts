import { Router } from "express";
import { checkJWT } from "../../services/auth/auth.ts";
import { getDayAndMonthImages } from "../../services/images/images.ts";
import { addFreshBaseUrls } from "../middlewares/images/images.ts";

const route = Router();

let imageUrls: { source: string; id: number; width: number; height: number }[];

export const images = (app: Router) => {
  app.use("/images", route);

  route.get("/", async (req, res) => {
    try {
      const access_token = checkJWT(req);
      if (access_token) {
        const imagesMatchingCurrentDayAndMonth = await getDayAndMonthImages(
          access_token
        );
        if (!imagesMatchingCurrentDayAndMonth?.length) {
          res.json({ imageUrls: [] });
        }

        const updatedImages = await addFreshBaseUrls(
          access_token,
          imagesMatchingCurrentDayAndMonth
        );

        const response = updatedImages.map(
          ({ photoUrl, id, height, width }) => ({
            source: photoUrl,
            id,
            height,
            width,
          })
        );

        res.json({ imageUrls: response });
      }
    } catch (err) {
      console.log("get error", err);
      res.cookie("jwt", undefined).status(403).json(err);
    }
  });

  route.post("/", (req, res) => {
    try {
      if (!!req.body?.image) {
        checkJWT(req);
        imageUrls = imageUrls.filter((old) => old.id !== req.body.image.id);
        res.status(201).json({});
      }
    } catch (err) {
      console.log("post err", err);
      res.cookie("jwt", undefined).status(403).json(err);
    }
  });
};
