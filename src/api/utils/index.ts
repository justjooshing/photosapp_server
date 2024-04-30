import { Prisma } from "@prisma/client";
import { prisma } from "../../loaders/prisma.js";
import { Response } from "express";

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
