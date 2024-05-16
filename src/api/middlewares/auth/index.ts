import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../../config/index.js";
import { getTokenFromHeader } from "@/services/auth/auth.js";
import jwt from "jsonwebtoken";
import { handleError } from "@/utils/index.js";

export const checkJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getTokenFromHeader(req);
    const verifiedToken = jwt.verify(token, CONFIG.JWTsecret, {
      complete: false,
    }) as string;

    req.locals.access_token = verifiedToken;
    next();
  } catch (err) {
    handleError({
      error: { from: "JWT", err },
      res,
      callback: () => res.status(401).json({ message: "Auth issue" }),
    });
  }
};
