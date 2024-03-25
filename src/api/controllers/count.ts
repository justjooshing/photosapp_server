import { Request, Response } from "express";
import { getSortCounts } from "../services/count/count.ts";

export const CountController = Object.freeze({
  getSortCounts: async (req: Request, res: Response) => {
    try {
      const counts = await getSortCounts(req.locals.appUser.id);
      res.status(200).send(counts);
    } catch (err) {
      res.status(500).send("Unexpected error");
    }
  },
});
