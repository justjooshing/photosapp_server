import { NextFunction, Request, Response } from "express";
import { findUser } from "../../services/user/user.ts";
import { getGoogleUser } from "../../third-party/user.ts";

export const getUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { access_token } = req.locals;
  try {
    const googleUser = await getGoogleUser(access_token);
    const appUser = await findUser(googleUser);

    req.locals.user = appUser;
    next();
  } catch (err) {
    console.error("ERROR", err);
    res.status(401).send(err);
  }
};
