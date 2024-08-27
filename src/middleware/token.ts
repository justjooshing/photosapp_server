import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { handleError } from "@/api/utils/index.js";
import { google } from "googleapis";
import { getTokenFromHeader } from "@/api/auth/services.js";
import { CONFIG, oauth2Config } from "../config/index.js";

export const checkJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const verifiedToken = jwt.verify(
      getTokenFromHeader(req, "authorization"),
      CONFIG.JWTsecret,
      {
        complete: false,
      },
    ) as string;
    req.locals.access_token = verifiedToken;

    const refresh_token = jwt.verify(
      getTokenFromHeader(req, "rt"),
      CONFIG.JWTsecret,
      {
        complete: false,
      },
    ) as string;

    req.locals.refresh_token = refresh_token;

    next();
  } catch (err) {
    return handleError({
      error: { from: "JWT", err },
      res,
      callback: () => res.status(401).end(),
    });
  }
};

export const refreshAuthToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { access_token, refresh_token } = req.locals;
    if (access_token && refresh_token) {
      const client = new google.auth.OAuth2(oauth2Config);
      client.setCredentials({ access_token, refresh_token });
      const { expiry_date } = await client.getTokenInfo(access_token);
      // refresh if expiry date is in less than 30 minutes
      const thirty_minutes = 1000 * 60 * 30;
      if (Date.now() > expiry_date - thirty_minutes) {
        console.info("Access token expired, refreshing...");
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
        if (credentials.access_token) {
          req.locals.access_token = credentials.access_token;
          const token = jwt.sign(access_token, CONFIG.JWTsecret);
          res.header("Access-Control-Expose-Headers", ["Jwt", "rt"]);
          res.setHeader("Jwt", token);

          if (credentials.refresh_token) {
            const new_refresh_token = jwt.sign(
              credentials.refresh_token,
              CONFIG.JWTsecret,
            );

            req.locals.refresh_token = credentials.refresh_token;
            res.setHeader("rt", new_refresh_token);
          }
        }
      }
    }
    next();
  } catch (err) {
    return handleError({
      error: { from: "Refresh auth token", err },
      res,
      callback: () => res.status(401).end(),
    });
  }
};
