import jwt from "jsonwebtoken";

import { Request } from "express";
import { CONFIG } from "@/config/index.js";

export const getTokenFromHeader = (req: Request, headerName: string) => {
  const token = req.header(headerName);
  if (token) {
    const bearerToken = token?.split(" ");
    if (bearerToken[0] === "Token" || bearerToken[0] === "Bearer") {
      return bearerToken[1];
    }
    return token;
  }
  throw new Error(`No ${headerName} header`);
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
