import { Request, Response } from "express";
import { prisma } from "../../loaders/prisma.js";
import { oauth2Client } from "../../config/index.js";

export const UserController = Object.freeze({
  getUser: (req: Request, res: Response) => {
    const { googleProfilePicture, id } = req.locals.appUser;
    const user = {
      profilePicture: googleProfilePicture,
      id,
    };
    res.status(200).json({ user });
  },
  deleteUser: async (req: Request, res: Response) => {
    const { id } = req.locals.appUser;
    await prisma.user.delete({
      where: {
        id,
      },
    });

    await prisma.images.deleteMany({
      where: {
        userId: id,
      },
    });

    await prisma.image_sets.deleteMany({
      where: {
        userId: id,
      },
    });

    await prisma.album.deleteMany({
      where: { userId: id },
    });

    await oauth2Client.revokeToken(req.locals.access_token);
    res.status(201).end();
  },
});
