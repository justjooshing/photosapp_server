import { NextFunction, Request, Response } from "express";
import ky from "ky";
import { prisma } from "../../../loaders/prisma.ts";
import { UserData } from "../../services/user/types.ts";

export const updateUsersDB = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, id, picture } = req.locals.user;

    let appUser;
    appUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!appUser) {
      appUser = await prisma.user.create({
        data: {
          googleId: id,
          email,
          googleProfilePicture: picture,
        },
      });
      console.log("database updated");
    }
    req.locals.appUser = appUser;
    next();
  } catch (err) {
    res.status(400).send(err);
  }
};

export const getUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { access_token } = req.locals;
  try {
    const client = ky.create({
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    const endpoint = "https://www.googleapis.com/oauth2/v1/userinfo";
    const data = await client.get(endpoint);
    const user = await data.json<UserData>();
    req.locals.user = user;
    next();
  } catch (err) {
    console.error("ERROR", err);
    res.status(401).send(err);
  }
};
