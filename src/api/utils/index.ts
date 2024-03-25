import { Prisma } from "@prisma/client";
import { prisma } from "../../loaders/prisma.ts";

export const prismaRawSql = async <SchemaType>(sqlQuery: Prisma.Sql) =>
  await prisma.$queryRaw<SchemaType>(sqlQuery);
