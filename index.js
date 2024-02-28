import express from "express";
import cors from "cors";
import { CONFIG } from "./config.js";
import { getLoginLink } from "./login.js";
import { images } from "./mockImages.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const app = express();

const { port } = CONFIG;

app.use(cors());
app.use(express.json());

let imageUrls = images;

// https://blog.bitsrc.io/step-by-step-guide-to-implementing-oauth2-in-a-node-js-application-89c7e8d202bd
app.get("/auth/google/callback", (req, res) => {
  const oauth2Client = new OAuth2Client(
    CONFIG.oauth2Credentials.client_id,
    CONFIG.oauth2Credentials.client_secret,
    CONFIG.oauth2Credentials.redirect_uris[0]
  );

  if (req.query.error) {
    console.log(req.query.error);
    res.redirect("http://localhost:8081/");
  } else {
    oauth2Client.getToken(req.query.code, (err, token) => {
      if (err) {
        return res.redirect("http://localhost:8081/");
      }
      res.cookie("jwt", jwtsign(token, CONFIG.JWTsecret));
    });
  }
});

app.get("/api/login-link", (_, res) => {
  const loginLink = getLoginLink();
  res.json({ loginLink });
});

app.get("/api/images", (_, res) => {
  // reset images after sorting through them
  if (!imageUrls.length) {
    imageUrls = images;
  }
  res.json({ imageUrls });
});

app.post("/api/images", (req, res) => {
  imageUrls = imageUrls.filter((old) => old.id !== req.body.image.id);
  res.json({});
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
