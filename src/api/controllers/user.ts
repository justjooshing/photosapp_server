import { Request, Response } from "express";
import { prisma } from "../../loaders/prisma.js";
import { oauth2Client } from "../../config/index.js";
import { handleError } from "@/utils/index.js";
import { ApiUser } from "@/services/user/types.js";

export const UserController = Object.freeze({
  getUser: (req: Request, res: Response) => {
    const { googleProfilePicture, id } = req.locals.appUser;
    const user: ApiUser = {
      profilePicture: googleProfilePicture,
      id,
    };
    res.status(200).json({ user });
  },
  deleteUser: async (req: Request, res: Response) => {
    const { id } = req.locals.appUser;
    try {
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

      await prisma.user.delete({
        where: {
          id,
        },
      });

      await oauth2Client.revokeToken(req.locals.access_token);
      res.status(201).end();
    } catch (err) {
      return handleError({
        error: { err, from: "Delete user" },
        res,
        callback: () =>
          res.status(500).json({ message: "Error deleting user account" }),
      });
    }
  },
});
