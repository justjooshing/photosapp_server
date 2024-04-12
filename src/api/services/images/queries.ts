import { Prisma } from "@prisma/client";
import { ImageType } from "./types.ts";

export const todayQuery = (
  userId: number,
) => Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId} 
AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
AND EXTRACT(DAY FROM created_at) = EXTRACT(DAY FROM CURRENT_DATE)
AND updated_at IS NULL
AND actually_deleted IS NULL
ORDER BY created_at ASC, id ASC
LIMIT 5`;

export const similar = (userId: number) =>
  Prisma.sql`SELECT * FROM "Images" WHERE "userId" = ${userId}
  AND updated_at IS NULL
  AND actually_deleted IS NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 5`;

export const queryByImageType = (type: ImageType, userId: number) =>
  ({
    today: todayQuery(userId),
    similar: similar(userId),
  }[type]);
