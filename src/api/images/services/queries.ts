import { Prisma } from "@prisma/client";
import { SchemaImages } from "./types.js";
import { prismaRawSql } from "@/api/utils/index.js";
import { prisma } from "@/loaders/prisma.js";
import { ImageType } from "../types.js";

export const todayQuery = (
  userId: number,
) => Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND updated_at IS NULL
  AND actually_deleted IS NULL
  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
  AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE)
  AND mime_type != 'video/mp4'
  ORDER BY created_at ASC, id ASC
  LIMIT 5`;

export const getSimilarImages = async (userId: number) => {
  const imageSet = await prisma.image_sets.findFirst({
    where: {
      userId,
      NOT: {
        unsorted_image_ids: {
          isEmpty: true,
        },
      },
    },
    orderBy: [
      { minute: "asc" },
      {
        id: "asc",
      },
    ],
  });

  const images = await prisma.images.findMany({
    where: {
      userId,
      sorted_album_id: null,
      id: {
        in: imageSet?.unsorted_image_ids,
      },
    },
  });
  return images;
};

// update to prisma query
const getOldestImages = async (userId: number) =>
  await prisma.images.findMany({
    where: {
      userId,
      updated_at: null,
      actually_deleted: null,
      mime_type: {
        not: "video/mp4",
      },
    },
    orderBy: [
      {
        created_at: "asc",
      },
      {
        id: "asc",
      },
    ],
    take: 5,
  });

const getTodaysImages = async (userId: number) =>
  await prismaRawSql<SchemaImages[]>(todayQuery(userId));

export const queryByImageType = async (type: ImageType, userId: number) =>
  ({
    today: await getTodaysImages(userId),
    // Swap these back once similar is working
    oldest: await getOldestImages(userId),
    // similar: similar(userId),
    similar: await getSimilarImages(userId),
  }[type]);

/**
 * Used alongside initial import
 */
export const group_similar = (userId: number) =>
  Prisma.sql`SELECT date_trunc('minute', created_at) AS minute, array_agg(id) AS unsorted_image_ids FROM "Images" 
  WHERE "userId" = ${userId}
    AND updated_at IS NULL
    AND actually_deleted IS NULL
    AND mime_type != 'video/mp4'
  GROUP BY minute
  HAVING count(*) > 1
  ORDER BY minute`;
