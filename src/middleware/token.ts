import { Request, Response, NextFunction } from "express";
import { handleError } from "@/api/utils/index.js";
import { google } from "googleapis";
import { getTokenFromHeader, jwtHandler } from "@/api/auth/helpers.js";
import { CONFIG, oauth2Config } from "../config/index.js";
import { getRefreshToken } from "@/api/auth/services.js";

export const checkJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { access_token } = jwtHandler.verify(
      getTokenFromHeader(req, "authorization"),
    );
    req.locals.access_token = access_token;
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
      const { expiry_date, email, aud } = await client.getTokenInfo(
        access_token,
      );

      if (aud !== CONFIG.oauth2Credentials.client_id) {
        throw new Error("OAuth2 client/aud mismatch");
      }

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
          const new_token = jwtHandler.sign({ access_token });
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
