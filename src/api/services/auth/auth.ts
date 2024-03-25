import { Request } from "express";
import { CONFIG, oauth2Client } from "../../../config/index.ts";

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