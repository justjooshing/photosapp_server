import { Request, Response } from "express";

export const UserController = Object.freeze({
  getUser: (req: Request, res: Response) => {
    const { googleProfilePicture, id } = req.locals.appUser;
    const user = {
      profilePicture: googleProfilePicture,
      id,
    };
    res.status(200).json({ user });
  },
});
