import { Request, Response, NextFunction } from "express";
import { CONFIG, oauth2Client } from "../../../config/index.js";
import { getTokenFromHeader } from "@/services/auth/auth.js";
import jwt from "jsonwebtoken";
import { handleError } from "@/utils/index.js";

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
      const { expiry_date } = await oauth2Client.getTokenInfo(access_token);
      // refresh if now is later than expiry_date
      if (Date.now() > expiry_date) {
        console.info("Access token expired, refreshing...");
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        if (credentials.access_token) {
          req.locals.access_token = credentials.access_token;
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
