import { Request, Response } from "express";
import { CONFIG, oauth2Client } from "../../config/index.ts";
import jwt from "jsonwebtoken";
import { findOrCreateUser } from "../services/user/user.ts";
import { updateNewestImages } from "../services/images/images.ts";
import { getGoogleUser } from "../third-party/user.ts";
import { generateAccessToken } from "../third-party/auth.ts";
import { handleError } from "../utils/index.ts";

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
    if (req.query.error || typeof req.query.code !== "string") {
      return res.status(400).redirect(CONFIG.clientUrl);
    }

    try {
      const access_token = await generateAccessToken(req.query.code);
      if (!access_token) {
        throw new Error("No access token");
      }
      const user = await getGoogleUser(access_token);
      const appUser = await findOrCreateUser(user);
      updateNewestImages(access_token, appUser);
      res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret));
      res.redirect(CONFIG.clientUrl);
    } catch (err) {
      return handleError({
        error: { from: "Auth", err },
        res,
        callback: () =>
          res
            .status(500)
            .json({ message: "Login failed" })
            .redirect(CONFIG.clientUrl),
      });
    }
  },
});
