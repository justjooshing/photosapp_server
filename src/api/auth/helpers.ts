import jwt from "jsonwebtoken";

import { Request } from "express";
import { CONFIG } from "@/config/index.js";
import createHttpError from "http-errors";

export const getTokenFromHeader = (req: Request, headerName: string) => {
  const token = req.header(headerName);

  if (!token) throw createHttpError(401, `No ${headerName} header`);

  const bearerToken = token?.split(" ");
  if (bearerToken[0] === "Token" || bearerToken[0] === "Bearer") {
    return bearerToken[1];
  }
  return token;
};

interface JwtPayload {
  access_token: string;
}
export const jwtHandler = {
  sign: (payload: JwtPayload) => jwt.sign(payload, CONFIG.JWTsecret),
  verify: (token: string) =>
    jwt.verify(token, CONFIG.JWTsecret, {
      complete: false,
    }) as JwtPayload,
};
