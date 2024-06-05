import { Prisma } from "@prisma/client";
import { prisma } from "../../loaders/prisma.js";
import { Response } from "express";
import { CONFIG } from "../../config/index.js";
import jwt from "jsonwebtoken";

export const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) =>
  await prisma.$queryRaw<SchemaType>(sqlQuery);

export const handleError = ({
  error,
  res,
  callback,
}: {
  error: { from: string; err: Error | unknown };
  res: Response;
  callback: () => void;
}) => {
  console.error(`${error.from} ERROR`, error.err);
  if (error.err instanceof Error) {
    callback();
  } else {
    res.status(500).json({ message: "Something went wrong" });
  }
};

type StaticOrigin =
  | boolean
  | string
  | RegExp
  | Array<boolean | string | RegExp>;
type CustomOrigin = {
  requestOrigin: string | undefined;
  callback: (err: Error | null, origin?: StaticOrigin) => void;
};

export const handleCorsOrigin = (
  origin: CustomOrigin["requestOrigin"],
  callback: CustomOrigin["callback"],
) => {
  if (!origin || CONFIG.whiteListUrls.indexOf(origin) !== -1) {
    return callback(null, true);
  }
  console.error({ origin });
  return callback(new Error("Not allowed by CORS"));
};

interface SignAndSetTokenProps {
  res: Response;
  access_token: string;
}

export const signAndSetToken = ({
  res,
  access_token,
}: SignAndSetTokenProps) => {
  const token = jwt.sign(access_token, CONFIG.JWTsecret);
  res.header("Access-Control-Expose-Headers", "Jwt");
  res.setHeader("Jwt", token);
};
