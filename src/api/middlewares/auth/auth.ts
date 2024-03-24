import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../../config/index.ts";
import {
  generateAccessToken,
  getTokenFromHeader,
} from "../..//services/auth/auth.ts";
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
    console.error(err);
    res.status(401).send(err);
  }
};

export const handleGoogleAuthError = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.query.error) {
    res.status(400);
    res.redirect(CONFIG.clientUrl);
  } else next();
};

export const handleGoogleAuthCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (typeof req.query.code === "string") {
    try {
      const access_token = await generateAccessToken(req.query.code);
      if (access_token) {
        req.locals.access_token = access_token;
        next();
        res.cookie("jwt", jwt.sign(access_token, CONFIG.JWTsecret));
        res.redirect(CONFIG.clientUrl);
      }
    } catch (err) {
      // Maybe redirect to error page
      res.status(400);
      return res.redirect(CONFIG.clientUrl);
    }
  } else {
    res.status(400);
    return res.redirect(CONFIG.clientUrl);
  }
};
