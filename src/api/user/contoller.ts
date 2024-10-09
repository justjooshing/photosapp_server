import { Request, Response } from "express";
import { prisma } from "@/loaders/prisma.js";
import { oauth2Client } from "@/config/index.js";
import { ApiUser } from "@/api/user/services/types.js";

export const UserController = Object.freeze({
  getUser: (req: Request, res: Response) => {
    const { googleProfilePicture, id } = req.locals.appUser;
    const user: ApiUser = {
      profilePicture: googleProfilePicture,
      id,
    };
    res.status(200).json({ user });
    return;
  },
  deleteUser: async (req: Request, res: Response) => {
    const { id, email } = req.locals.appUser;
    await prisma.$transaction(async (tx) => {
      // will cascade delete relational images, image_sets and albums
      await tx.user.delete({
        where: {
          id,
        },
      });
      await tx.refresh_token.delete({
        where: { email },
      });
    });
    await oauth2Client.revokeToken(req.locals.access_token);
    console.info("user delete, token revoked");
    res.status(201).end();
    return;
  },
});
