import { Request, Response, NextFunction } from "express";
import { CONFIG } from "../../../config/index.ts";
import { getTokenFromHeader } from "@/services/auth/auth.ts";
import jwt from "jsonwebtoken";
import { handleError } from "@/utils/index.ts";

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
      callback: () =>
        res
          .cookie("jwt", undefined)
          .status(401)
          .json({ message: "Auth issue" }),
    });
  }
};
