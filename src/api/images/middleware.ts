import { zImage, zImageId, zImageType } from "./validation.js";
import { handleError } from "@/api/utils/index.js";
import { NextFunction, Request, Response } from "express";

export const validateImageType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    zImageType.parse({ type: req.query.type });
    next();
  } catch (err) {
    return handleError({
      error: { from: "Single image validation", err },
      res,
    });
  }
};

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
    });
  }
};
