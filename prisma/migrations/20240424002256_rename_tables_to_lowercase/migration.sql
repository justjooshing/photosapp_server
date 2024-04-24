/*
  Warnings:

  - You are about to drop the column `imageSetId` on the `Images` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Images" DROP CONSTRAINT "Images_imageSetId_fkey";

-- AlterTable
ALTER TABLE "Image_Sets" ADD COLUMN     "sorted_image_ids" INTEGER[],
ADD COLUMN     "unsorted_image_ids" INTEGER[];

-- AlterTable
ALTER TABLE "Images" DROP COLUMN "imageSetId",
ADD COLUMN     "image_set_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_image_set_id_fkey" FOREIGN KEY ("image_set_id") REFERENCES "Image_Sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
