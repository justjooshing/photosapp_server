ALTER TABLE "Image_Sets" DROP COLUMN "unsorted_image_ids";
ALTER TABLE "Image_Sets" RENAME COLUMN "image_ids" TO "unsorted_image_ids";

