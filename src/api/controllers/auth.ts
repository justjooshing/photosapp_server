import { Request, Response } from "express";
import { CONFIG, oauth2Client } from "../../config/index.js";
import jwt from "jsonwebtoken";
import { findOrCreateUser } from "@/services/user/user.js";
import { updateNewestImages } from "@/services/images/images.js";
import { getGoogleUser } from "@/third-party/user.js";
import { generateAccessToken } from "@/third-party/auth.js";
import { handleError } from "@/utils/index.js";

export const AuthController = Object.freeze({
  appLogin: (_: Request, res: Response) => {
    const loginLink = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CONFIG.oauth2Credentials.scopes,
      login_hint: "consent",
    });

    res.status(200).json({ loginLink });
  },
  handleGoogleLogin: async (req: Request, res: Response) => {
    const redirect_uri = CONFIG.redirect_uri;
    if (!redirect_uri) {
      return res.status(400);
    }
    if (req.query.error || typeof req.query.code !== "string") {
      return res.status(400).redirect(redirect_uri);
    }
    try {
      const access_token = await generateAccessToken(req.query.code);
      if (!access_token) {
        throw new Error("No access token");
      }
      const user = await getGoogleUser(access_token);
      const appUser = await findOrCreateUser(user);
      updateNewestImages(access_token, appUser);
      res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret), {
        secure: false,
      });
      res.redirect(redirect_uri);
    } catch (err) {
      handleError({
        error: { from: "Auth", err },
        res,
        callback: () => res.status(500).redirect(redirect_uri),
      });
    }
  },
});
