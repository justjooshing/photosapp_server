import { Prisma } from "@prisma/client";
import { prisma } from "@/loaders/prisma.js";
import { Response } from "express";
import { GaxiosError } from "gaxios";
import { ZodError } from "zod";

export const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) =>
  await prisma.$queryRaw<SchemaType>(sqlQuery);

export const handleError = ({
  error,
  res,
  callback,
}: {
  error: { from: string; err: GaxiosError | Error | unknown };
  res: Response;
  callback?: () => void;
}) => {
  console.error(`${error.from} ERROR`, error.err);
  if (error.err instanceof ZodError) {
    return res.status(400).end();
  }
  if (error.err instanceof Error && callback) {
    return callback();
  }
  if ((error.err as GaxiosError)?.response?.status) {
    return res.status((error.err as GaxiosError).response!.status || 500).end();
  }
  return res.status(500).end();
};

export const bigIntToString = (val: bigint | null) => {
  return val?.toString() || "0";
};

export const excludeMimeType = {
  AND: [
    { mime_type: { not: null } },
    {
      mime_type: {
        not: "video/mp4",
      },
    },
  ],
};
