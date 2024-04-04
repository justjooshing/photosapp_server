import { prisma } from "../../../loaders/prisma.ts";

const selectCountByColumn = async (userId: number, choice: "delete" | "keep") =>
  await prisma.images.count({
    where: {
      userId,
      sorted_status: choice,
    },
  });

export const getSortCounts = async (userId: number) => {
  const deletedCount = await selectCountByColumn(userId, "delete");
  const sortedCount = await selectCountByColumn(userId, "keep");

  return { deletedCount, sortedCount };
};
