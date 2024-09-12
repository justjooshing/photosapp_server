import { Prisma } from "@prisma/client";
import { prisma } from "@/loaders/prisma.js";

export const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) =>
  await prisma.$queryRaw<SchemaType>(sqlQuery);

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
