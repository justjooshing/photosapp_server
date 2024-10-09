import { zImage, zImageId, zImageType } from "./validation.js";
import { NextFunction, Request, Response } from "express";

export const validateImageType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  zImageType.parse({ type: req.query.type });
  next();
};

export const validateGetSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  zImageId.parse({ id: req.params.imageId });
  next();
};

export const validateUpdateSingleImage = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  zImageId.parse({ id: req.params.imageId });
  zImage.parse(req.body);
  next();
};
