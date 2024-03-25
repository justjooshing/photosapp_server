import { prisma } from "../../../loaders/prisma.ts";
import { Prisma } from "@prisma/client";

const selectCountByColumn = async (
  userId: number,
  column: Prisma.ImagesScalarFieldEnum
) =>
  await prisma.images.count({
    where: {
      userId,
      [column]: {
        not: null,
      },
    },
  });

export const getSortCounts = async (userId: number) => {
  const deletedCount = await selectCountByColumn(userId, "deleted_at");
  const sortedCount = await selectCountByColumn(userId, "sorted_at");

  return { deletedCount, sortedCount };
};
