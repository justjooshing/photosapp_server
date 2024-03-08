import { Router } from "express";
import jwt from "jsonwebtoken";
import { CONFIG } from "../../config/index.ts";
import { generateAccessToken } from "../../services/auth/auth.ts";
import { getUserData } from "../../services/user/user.ts";

export const auth = (app: Router) => {
  app.get("/auth/google/callback", async (req, res) => {
    if (req.query.error) {
      res.redirect(CONFIG.clientUrl);
    } else {
      if (typeof req.query.code === "string") {
        try {
          const access_token = await generateAccessToken(req.query.code);
          if (access_token) {
            getUserData(access_token);
            res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret));
            res.redirect(CONFIG.clientUrl);
          }
        } catch (err) {
          // Maybe redirect to error page
          return res.redirect(CONFIG.clientUrl);
        }
      }
    }
  });
};
