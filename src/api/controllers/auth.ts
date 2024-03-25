import { Request, Response } from "express";
import { CONFIG, oauth2Client } from "../../config/index.ts";
import { generateAccessToken } from "../services/auth/auth.ts";
import jwt from "jsonwebtoken";
import { findOrCreateUser, getUser } from "../services/user/user.ts";
import { updateImages } from "../services/images/images.ts";

export const AuthController = Object.freeze({
  appLogin: () => {
    const loginLink = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: CONFIG.oauth2Credentials.scopes,
      login_hint: "consent",
    });

    return loginLink;
  },
  handleGoogleLogin: async (req: Request, res: Response) => {
    const returnToErrorPage = () => {
      res.status(400);
      res.redirect(CONFIG.clientUrl);
      return;
    };

    if (req.query.error || req.query.code !== "string") {
      return returnToErrorPage();
    }
    try {
      const access_token = await generateAccessToken(req.query.code);
      if (access_token) {
        const user = await getUser(access_token);
        const appUser = await findOrCreateUser(user);
        updateImages(access_token, appUser);
        res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret));
        res.redirect(CONFIG.clientUrl);
      }
    } catch (err) {
      return returnToErrorPage();
    }
  },
});
