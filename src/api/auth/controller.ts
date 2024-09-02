import { Request, Response } from "express";
import { CONFIG, oauth2Client } from "@/config/index.js";
import jwt from "jsonwebtoken";
import {
  findOrCreateUser,
  updateUserLastUpdate,
} from "@/api/user/services/user.js";
import { updateNewestImages } from "@/api/images/services/images.js";
import { getGoogleUser } from "@/api/third-party/user.js";
import { generateAccessToken } from "@/api/third-party/auth.js";
import { handleError } from "@/api/utils/index.js";
import { updateRefeshToken } from "./services.js";

const redirect_uri = CONFIG.redirect_uri;

export const AuthController = Object.freeze({
  appLogin: (_: Request, res: Response) => {
    try {
      const loginLink = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: CONFIG.oauth2Credentials.scopes,
      });

      return res.status(200).json({ loginLink });
    } catch (err) {
      return handleError({
        error: { from: "generateAuthUrl", err },
        res,
        callback: () => res.status(503).end(),
      });
    }
  },
  appLogout: async (req: Request, res: Response) => {
    try {
      await oauth2Client.revokeToken(req.locals.access_token);
      return res.status(204).end();
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
      const { access_token, refresh_token } = await generateAccessToken(
        req.query.code,
      );
      if (!access_token) {
        throw new Error("No access token");
      }
      const user = await getGoogleUser(access_token);
      const appUser = await findOrCreateUser(user);
      if (refresh_token) {
        await updateRefeshToken({ email: appUser.email, refresh_token });
      }

      // kickoff fetching new/initial images
      // but return user who will see images sets as they're added
      updateNewestImages(access_token, appUser);

      const token = jwt.sign(access_token, CONFIG.JWTsecret);
      const uri = new URL(redirect_uri);
      uri.searchParams.append("jwt", token);
      res.redirect(uri.toString());

      // Only update after new images are fully processed in case of errors
      return updateUserLastUpdate(appUser.id);
    } catch (err) {
      handleError({
        error: { from: "Auth", err },
        res,
        callback: () => res.status(500).redirect(redirect_uri),
      });
    }
  },
});
