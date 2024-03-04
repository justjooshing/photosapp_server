import { Router } from "express";
import { oauth2Client } from "../../../login.ts";
import jwt from "jsonwebtoken";
import { CONFIG } from "../../config/index.ts";

const route = Router();

interface IAuthRequest extends Request {
  headers: Request["headers"] & {
    authorization: string;
  };
}
let imageUrls: { source: string; id: string }[];

const getTokenFromHeader = (req: IAuthRequest) => {
  if (
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Token") ||
    (req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer")
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  throw new Error("No token");
};

const checkJWT = (req: IAuthRequest): jwt.JwtPayload => {
  const token = getTokenFromHeader(req);
  console.log({ token });
  const verified: jwt.JwtPayload | null = jwt.verify(token, CONFIG.JWTsecret, {
    complete: true,
  });
  // Can/should I do this? Is it a good idea?
  // @ts-ignore
  oauth2Client.credentials = verified;
  return verified;
};

const fetchPhotos = async (access_token: string) => {
  try {
    const params = new URLSearchParams();
    params.append("pageSize", "3");
    const res = await fetch(
      "https://photoslibrary.googleapis.com/v1/mediaItems",
      {
        method: "get",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const images = await res.json();
    // @ts-ignore
    const urls = images.mediaItems.map(({ baseUrl, id }) => ({
      source: baseUrl,
      id,
    }));
    return urls;
  } catch (err) {
    console.error(err);
  }
};

export const images = (app: Router) => {
  app.use("/images", route);

  // @ts-ignore
  route.get("/", async (req: IAuthRequest, res) => {
    try {
      const verified = checkJWT(req);
      if (verified) {
        const fetchedImages = await fetchPhotos(verified.access_token);
        // reset images after sorting through them
        if (!imageUrls?.length) {
          imageUrls = fetchedImages;
        }
        res.json({ imageUrls });
      }
    } catch (err) {
      console.log("get error", err);
      res.cookie("jwt", undefined).status(403).json(err);
    }
  });

  // @ts-ignore
  route.post("/", (req: IAuthRequest, res) => {
    try {
      // @ts-ignore
      if (!!req.body?.image) {
        checkJWT(req);
        // @ts-ignore
        imageUrls = imageUrls.filter((old) => old.id !== req.body.image.id);
        res.json({});
      }
    } catch (err) {
      console.log("post err", err);
      res.cookie("jwt", undefined).status(403).json(err);
    }
  });
};
