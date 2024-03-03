import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { getLoginLink, oauth2Client } from "./login.js";
import { images } from "./mockImages.js";
import jwt from "jsonwebtoken";
import cookies from "cookie-parser";
import bodyParser from "body-parser";
const app = express();

const { port } = CONFIG;

app.use(cors());
app.use(express.json());
app.use(cookies());
app.use(bodyParser.urlencoded({ extended: true }));

const clientUrl = "http://localhost:8081/";

let imageUrls;

// https://blog.bitsrc.io/step-by-step-guide-to-implementing-oauth2-in-a-node-js-application-89c7e8d202bd
app.get("/auth/google/callback", (req, res) => {
  if (req.query.error) {
    console.log(req.query.error);
    res.redirect(clientUrl);
  } else {
    oauth2Client.getToken(
      {
        code: req.query.code,
        client_id: CONFIG.oauth2Credentials.client_id,
        redirect_uri: CONFIG.oauth2Credentials.redirect_uris[0],
      },
      (err, token) => {
        if (err) {
          console.error(err);
          // Maybe redirect to error page
          return res.redirect(clientUrl);
        }
        res.cookie("jwt", jwt.sign(token, CONFIG.JWTsecret));
        res.redirect(clientUrl);
      }
    );
  }
});

app.get("/api/login-link", (_, res) => {
  const loginLink = getLoginLink();
  res.json({ loginLink });
});

const checkJWT = (req) => {
  const token = req.headers.authorization.split(" ")[1];
  oauth2Client.credentials = jwt.verify(token, CONFIG.JWTsecret);
  return token;
};

const fetchPhotos = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const params = new URLSearchParams();
    params.append("pageSize", 3);
    const res = await fetch(
      "https://photoslibrary.googleapis.com/v1/mediaItems",
      {
        method: "get",
        headers: {
          Authorization: `Bearer ${decoded.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const images = await res.json();
    const urls = images.mediaItems.map(({ baseUrl, id }) => ({
      source: baseUrl,
      id,
    }));
    return urls;
  } catch (err) {
    console.error(err);
  }
};

app.get("/api/images", async (req, res) => {
  try {
    const token = checkJWT(req);
    const fetchedImages = await fetchPhotos(token);
    // reset images after sorting through them
    if (!imageUrls?.length) {
      imageUrls = fetchedImages;
    }
    res.json({ imageUrls });
  } catch (err) {
    console.log("get error", err);
    res.cookie("jwt", undefined).status(403).json(err);
  }
});

app.post("/api/images", (req, res) => {
  try {
    checkJWT(req, res);
    imageUrls = imageUrls.filter((old) => old.id !== req.body.image.id);
    res.json({});
  } catch (err) {
    console.log("post err", err);
    res.cookie("jwt", undefined).status(403).json(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
