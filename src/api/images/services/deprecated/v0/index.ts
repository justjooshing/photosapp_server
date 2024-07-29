import { prisma } from "../../../../../loaders/prisma.js";
import { ApiCounts } from "./types.js";

const selectCountByColumn = async (
  userId: number,
  sorted_status: "keep" | "delete",
) =>
  await prisma.images.count({
    where: {
      userId,
      sorted_status,
    },
  });

export const deprecated_getSortCounts = async (
  userId: number,
): Promise<ApiCounts> => {
  const numMarkDelete = await selectCountByColumn(userId, "delete");
  const numMarkDeleteLaterDeleted = await prisma.images.count({
    where: {
      userId,
      sorted_status: "delete",
      actually_deleted: {
        not: null,
      },
    },
  });

  const numMarkKeep = await selectCountByColumn(userId, "keep");
  const numMarkKeepLaterDeleted = await prisma.images.count({
    where: {
      userId,
      sorted_status: "keep",
      actually_deleted: {
        not: null,
      },
    },
  });

  const {
    _sum: { size: totalSizes },
    _count: { size: totalImages },
  } = await prisma.images.aggregate({
    where: { userId, size: { not: null } },
    _sum: { size: true },
    _count: { size: true },
  });

  const sizeInMB = totalSizes
    ? (totalSizes / BigInt(1000 * 1000)).toString()
    : "0";

  return {
    // each of these should have a count and total size
    numMarkDelete,
    numMarkKeep,
    numMarkDeleteLaterDeleted,
    numMarkKeepLaterDeleted,
    totalImages,
    sizeInMB,
  };
};
