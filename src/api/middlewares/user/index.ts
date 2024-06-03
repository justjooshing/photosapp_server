import { NextFunction, Request, Response } from "express";
import { findUser } from "@/services/user/user.js";
import { getGoogleUser } from "@/third-party/user.js";
import { handleError } from "@/utils/index.js";

export const getUserData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { access_token } = req.locals;
  try {
    const googleUser = await getGoogleUser(access_token);
    const appUser = await findUser(googleUser);
    if (!appUser) {
      return res.status(404).json({ message: new Error("Not found") });
    }
    req.locals.appUser = appUser;
    next();
  } catch (err) {
    handleError({
      error: { from: "getUserData middleware", err },
      res,
      callback: () => res.status(401).json({ message: err }),
    });
  }
};
