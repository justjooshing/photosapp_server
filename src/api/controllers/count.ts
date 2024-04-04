import { Request, Response } from "express";
import { getSortCounts } from "../services/count/count.ts";
import { handleError } from "../utils/index.ts";

export const CountController = Object.freeze({
  getSortCounts: async (req: Request, res: Response) => {
    try {
      const counts = await getSortCounts(req.locals.appUser.id);
      res.status(200).json({ counts });
    } catch (err) {
      handleError({
        error: { from: "Counts", err },
        res,
        callback: () =>
          res.status(500).json({ message: "Error fetching counts" }),
      });
    }
  },
});
