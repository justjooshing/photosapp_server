import { NextFunction, Request, Response } from "express";
import { findUser, getUser } from "../../services/user/user.ts";

export const getUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { access_token } = req.locals;
  try {
    const googleUser = await getUser(access_token);
    const appUser = await findUser(googleUser);

    req.locals.user = appUser;
    next();
  } catch (err) {
    console.error("ERROR", err);
    res.status(401).send(err);
  }
};
