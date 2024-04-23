import { Prisma } from "@prisma/client";
import { ImageType } from "./types.ts";

const todayQuery = (
  userId: number,
) => Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND updated_at IS NULL
  AND actually_deleted IS NULL
  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
  AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE)
  AND mime_type != 'video/mp4'
  ORDER BY created_at ASC, id ASC
  LIMIT 5`;

const oldest = (userId: number) =>
  Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND updated_at IS NULL
  AND actually_deleted IS NULL
  AND mime_type != 'video/mp4'
  ORDER BY created_at ASC, id ASC
  LIMIT 5`;

const similar = (userId: number) =>
  Prisma.sql`SELECT date_trunc('minute', created_at) AS minute, array_agg(id) AS image_ids FROM "Images" 
  WHERE "userId" = ${userId}
  AND updated_at IS NULL
  AND actually_deleted IS NULL
  AND mime_type != 'video/mp4'
  GROUP BY minute
  ORDER BY minute`;

export const queryByImageType = (type: ImageType, userId: number) =>
  ({
    today: todayQuery(userId),
    // Swap these back once similar is working
    similar: oldest(userId),
    oldest: similar(userId),
  }[type]);
