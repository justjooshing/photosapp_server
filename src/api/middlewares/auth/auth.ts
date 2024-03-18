import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../../config/index.ts";
import { generateAccessToken } from "../../../services/auth/auth.ts";
import { getUserData } from "../../../services/user/user.ts";
import jwt from "jsonwebtoken";

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

export const handleGoogleAuthCode = async (req: Request, res: Response) => {
  if (typeof req.query.code === "string") {
    try {
      const access_token = await generateAccessToken(req.query.code);
      if (access_token) {
        getUserData(access_token);
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
