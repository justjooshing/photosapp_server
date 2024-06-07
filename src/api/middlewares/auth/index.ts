import { Request, Response, NextFunction } from "express";
import { CONFIG, oauth2Config } from "../../../config/index.js";
import { getTokenFromHeader } from "@/services/auth/auth.js";
import jwt from "jsonwebtoken";
import { handleError, signAndSetToken } from "@/utils/index.js";
import { google } from "googleapis";

export const checkJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = getTokenFromHeader(req);
    const verifiedToken = jwt.verify(token, CONFIG.JWTsecret, {
      complete: false,
    }) as string;

    req.locals.access_token = verifiedToken;
    next();
  } catch (err) {
    return handleError({
      error: { from: "JWT", err },
      res,
      callback: () => res.status(401).json({ message: "Auth issue" }),
    });
  }
};

export const refreshAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { access_token } = req.locals;
    if (access_token) {
      const client = new google.auth.OAuth2(oauth2Config);
      client.setCredentials({ access_token });
      const { expiry_date } = await client.getTokenInfo(access_token);
      // refresh if expiry date is in less than 30 minutes
      const thirty_minutes = 1000 * 60 * 30;
      if (Date.now() > expiry_date - thirty_minutes) {
        console.info("Access token expired, refreshing...");
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
        if (credentials.access_token) {
          req.locals.access_token = credentials.access_token;
          signAndSetToken({ res, access_token });
        }
      }
    }
    next();
  } catch (err) {
    return handleError({
      error: { from: "Refresh auth token", err },
      res,
      callback: () => res.status(401).json({ message: "Auth issue" }),
    });
  }
};
