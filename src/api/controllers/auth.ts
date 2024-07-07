import { Request, Response } from "express";
import { CONFIG, oauth2Client } from "../../config/index.js";
import jwt from "jsonwebtoken";
import { findOrCreateUser } from "@/services/user/user.js";
import {
  updateImageSizes,
  updateNewestImages,
} from "@/services/images/images.js";
import { getGoogleUser } from "@/third-party/user.js";
import { generateAccessToken } from "@/third-party/auth.js";
import { handleError } from "@/utils/index.js";

const redirect_uri = CONFIG.redirect_uri;

export const AuthController = Object.freeze({
  appLogin: (_: Request, res: Response) => {
    const loginLink = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CONFIG.oauth2Credentials.scopes,
    });

    res.status(200).json({ loginLink });
  },
  appLogout: async (req: Request, res: Response) => {
    try {
      await oauth2Client.revokeToken(req.locals.access_token);
      res.status(204).end();
    } catch (err) {
      handleError({
        error: { from: "logout", err },
        res,
        callback: () => res.status(500).redirect(redirect_uri),
      });
    }
  },
  handleGoogleLogin: async (req: Request, res: Response) => {
    if (!redirect_uri) {
      return res.status(400).end();
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

      await updateNewestImages(access_token, appUser);
      await updateImageSizes(access_token, appUser.id);
      const token = jwt.sign(access_token, CONFIG.JWTsecret);
      const uri = new URL(redirect_uri);
      uri.searchParams.append("jwt", token);
      res.redirect(uri.toString());
    } catch (err) {
      handleError({
        error: { from: "Auth", err },
        res,
        callback: () => res.status(500).redirect(redirect_uri),
      });
    }
  },
});
