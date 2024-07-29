import { zImage, zImageId } from "./schema.js";
import { handleError } from "@/utils/index.js";
import { NextFunction, Request, Response } from "express";

export const validateUpdateSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    zImageId.parse({ id: req.params.imageId });
    zImage.parse(req.body);
    next();
  } catch (err) {
    return handleError({
      error: { from: "Single image validation", err },
      res,
      callback: () => {
        res.status(400).json({ message: "Invalid properties" });
      },
    });
  }
};
