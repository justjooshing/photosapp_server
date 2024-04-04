/*
  Warnings:

  - You are about to drop the column `deleted_album_id` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `sorted_at` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Images` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Images" DROP CONSTRAINT "Images_deleted_album_id_fkey";

-- AlterTable
ALTER TABLE "Images" 
ADD COLUMN "sorted_status" VARCHAR(255),
ADD COLUMN "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

UPDATE "Images"
SET sorted_status = CASE 
                    WHEN deleted_at IS NOT NULL AND sorted_at IS NULL THEN 'delete'
                    WHEN sorted_at IS NOT NULL AND deleted_at IS NULL THEN 'keep'
                    WHEN deleted_at > sorted_at THEN 'delete'
                    WHEN sorted_at > deleted_at THEN 'keep'
                    ELSE NULL
                   END;

UPDATE "Images"
SET updated_at = CASE 
                  WHEN deleted_at IS NOT NULL AND sorted_at IS NULL THEN deleted_at
                  WHEN sorted_at IS NOT NULL AND deleted_at IS NULL THEN sorted_at
                  WHEN deleted_at > sorted_at THEN deleted_at 
                  WHEN sorted_at > deleted_at THEN sorted_at
                  ELSE NULL
                 END;

ALTER TABLE "Images"
RENAME COLUMN "deleted_album_id" TO "sorted_album_id";

ALTER TABLE "Images"
DROP COLUMN "deleted_at",
DROP COLUMN "sorted_at",
DROP COLUMN "height",
DROP COLUMN "width";

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_sorted_album_id_fkey" FOREIGN KEY ("sorted_album_id") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
