import { Request, Response } from "express";
import { prisma } from "@/loaders/prisma.js";
import { oauth2Client } from "@/config/index.js";
import { handleError } from "@/api/utils/index.js";
import { ApiUser } from "@/api/user/services/types.js";

export const UserController = Object.freeze({
  getUser: (req: Request, res: Response) => {
    const { googleProfilePicture, id } = req.locals.appUser;
    const user: ApiUser = {
      profilePicture: googleProfilePicture,
      id,
    };
    return res.status(200).json({ user });
  },
  deleteUser: async (req: Request, res: Response) => {
    const { id, email } = req.locals.appUser;
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

      await prisma.refresh_token.delete({
        where: { email },
      });

      await oauth2Client.revokeToken(req.locals.access_token);
      return res.status(201).end();
    } catch (err) {
      return handleError({
        error: { err, from: "Delete user" },
        res,
      });
    }
  },
});
