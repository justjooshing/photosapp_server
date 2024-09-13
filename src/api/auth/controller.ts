import { NextFunction, Request, Response } from "express";
import { CONFIG, oauth2Client } from "@/config/index.js";
import {
  findOrCreateUser,
  updateUserLastUpdate,
} from "@/api/user/services/user.js";
import { getGoogleUser } from "@/api/third-party/user.js";
import { generateAccessToken } from "@/api/third-party/auth.js";
import { updateRefeshToken } from "./services.js";
import { getSocketInstance } from "@/loaders/socket.js";
import { jwtHandler } from "./helpers.js";
import createHttpError from "http-errors";
import { updateNewestImages } from "../images/helpers.js";

const redirect_uri = CONFIG.redirect_uri;

export const AuthController = Object.freeze({
  appLogin: (_: Request, res: Response, next: NextFunction) => {
    try {
      const loginLink = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: CONFIG.oauth2Credentials.scopes,
      });

      return res.status(200).json({ loginLink });
    } catch (err) {
      next(err);
    }
  },
  appLogout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await oauth2Client.revokeToken(req.locals.access_token);

      // force close existing sockets related to current user
      const io = getSocketInstance();
      io.in(req.locals.appUser.id.toString()).disconnectSockets();
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
  handleGoogleLogin: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (req.query.error || typeof req.query.code !== "string") {
        throw createHttpError(400, "Login error or no auth code", {
          redirectUrl: redirect_uri,
        });
      }
      const { access_token, refresh_token } = await generateAccessToken(
        req.query.code,
      );
      if (!access_token) {
        throw createHttpError(401, "No access token", {
          redirectUrl: redirect_uri,
        });
      }
      const user = await getGoogleUser(access_token);

      const appUser = await findOrCreateUser(user);
      if (refresh_token) {
        await updateRefeshToken({ email: appUser.email, refresh_token });
      }
      // kickoff fetching new/initial images
      // but return user who will see images sets as they're added
      updateNewestImages(access_token, appUser);

      const token = jwtHandler.sign({ access_token });
      const uri = new URL(redirect_uri);
      uri.searchParams.append("jwt", token);
      res.redirect(uri.toString());

      // Only update after new images are fully processed in case of errors
      return await updateUserLastUpdate(appUser.id);
    } catch (err) {
      next(createHttpError(err as Error, { redirectUrl: redirect_uri }));
    }
  },
});
