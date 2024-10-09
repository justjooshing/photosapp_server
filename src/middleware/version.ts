import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";

export const checkAppVersion = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const version = req.header("app-version");
  if (version !== "web" && (!version || !Number(version))) {
    throw createHttpError(400, "Invalid app version");
  }
  req.locals.app_version = Number(version);
  next();
};
