import jwt from "jsonwebtoken";
import { CONFIG } from "../../config/index.ts";
import { Request } from "express";
import { oauth2Client } from "../login.ts";

export const getTokenFromHeader = (req: Request) => {
  const auth = req.header("authorization");
  if (auth) {
    const bearerToken = auth?.split(" ");
    if (bearerToken[0] === "Token" || bearerToken[0] === "Bearer") {
      return bearerToken[1];
    }
  }
  throw new Error("No token");
};

export const checkJWT = (req: Request): string => {
  const token = getTokenFromHeader(req);
  const verifiedToken = jwt.verify(token, CONFIG.JWTsecret, {
    complete: false,
  }) as string;
  return verifiedToken;
};

export const generateAccessToken = async (code: string) => {
  try {
    const token = await oauth2Client.getToken({
      code,
      client_id: CONFIG.oauth2Credentials.client_id,
      redirect_uri: CONFIG.oauth2Credentials.redirect_uris[0],
    });
    return token.tokens.access_token;
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
  }
};
