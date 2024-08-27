import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { handleError } from "@/api/utils/index.js";
import { google } from "googleapis";
import { getTokenFromHeader } from "@/api/auth/helpers.js";
import { CONFIG, oauth2Config } from "../config/index.js";
import { getRefreshToken } from "@/api/auth/services.js";

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
    const { access_token } = req.locals;
    if (access_token) {
      const client = new google.auth.OAuth2(oauth2Config);

      client.setCredentials({ access_token });
      const { expiry_date, email } = await client.getTokenInfo(access_token);

      // refresh if expiry date is in less than 10 minutes
      const ten_minutes = 1000 * 60 * 50;
      const needsRefreshing = Date.now() > expiry_date - ten_minutes;
      if (email && needsRefreshing) {
        console.info("Access token expired, refreshing...");

        // get refresh_token
        const refresh_token = await getRefreshToken({ email });
        client.setCredentials({ refresh_token });

        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);
        if (credentials.access_token) {
          req.locals.access_token = credentials.access_token;
          const new_token = jwt.sign(access_token, CONFIG.JWTsecret);
          res.header("Access-Control-Expose-Headers", "jwt");
          res.setHeader("jwt", new_token);
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
