import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../../config/index.ts";
import { getTokenFromHeader } from "../../services/auth/auth.ts";
import jwt from "jsonwebtoken";

export const checkJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromHeader(req);
    const verifiedToken = jwt.verify(token, CONFIG.JWTsecret, {
      complete: false,
    }) as string;

    req.locals.access_token = verifiedToken;
    next();
  } catch (err) {
    console.log("Check JWT ERR", err);
    res.cookie("jwt", undefined).status(401).send(err);
  }
};
