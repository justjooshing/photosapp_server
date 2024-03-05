import { Router } from "express";
import { checkJWT } from "../../services/auth/auth.ts";
import { fetchPhotos } from "../../services/images/images.ts";

const route = Router();

let imageUrls: { source: string; id: string }[];

export const images = (app: Router) => {
  app.use("/images", route);

  route.get("/", async (req, res) => {
    try {
      const access_token = checkJWT(req);
      if (access_token) {
        const fetchedImages = await fetchPhotos(access_token);
        if (fetchedImages) {
          // reset images after sorting through them
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
        res.json({});
      }
    } catch (err) {
      console.log("post err", err);
      res.cookie("jwt", undefined).status(403).json(err);
    }
  });
};
