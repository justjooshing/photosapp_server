import { Router } from "express";
import { checkJWT } from "../../services/auth/auth.ts";
import { getImages } from "../../services/images/images.ts";

const route = Router();

let imageUrls: { source: string; id: number; width: number; height: number }[];

export const images = (app: Router) => {
  app.use("/images", route);

  route.get("/", async (req, res) => {
    try {
      const access_token = checkJWT(req);
      if (access_token) {
        /**
         * fetch > db (if not already deleted)
         * sql query to return grouped images
         * if !groupedImages fetch again?
         */
        const fetchedImages = await getImages(access_token);
        if (fetchedImages) {
          // reset images after sorting through them
          // should update to use /nextPage if no arrays
          if (!imageUrls?.length) {
            imageUrls = fetchedImages;
          }
        }
        res.json({ imageUrls });
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
