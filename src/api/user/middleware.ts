import { NextFunction, Request, Response } from "express";
import { findUser } from "@/api/user/services/user.js";
import { getGoogleUser } from "@/api/third-party/user.js";

export const getUserData = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email } = await getGoogleUser(req.locals.access_token);
    const appUser = await findUser(email);
    if (!appUser) {
      return res.status(404).end();
    }
    req.locals.appUser = appUser;
    next();
  } catch (err) {
    next(err);
  }
};
