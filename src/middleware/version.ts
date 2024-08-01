import { handleError } from "@/api/utils/index.js";
import { NextFunction, Request, Response } from "express";

export const checkAppVersion = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const version = req.header("app-version");
    if (version !== "web" && (!version || !Number(version))) {
      throw new Error("Invalid app version");
    }
    req.locals.app_version = Number(version);
    next();
  } catch (err) {
    return handleError({
      error: { from: "checkAppVersion", err },
      res,
      callback: () => res.status(401).json({ message: "Auth issue" }),
    });
  }
};
