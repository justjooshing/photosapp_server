-- AlterTable
ALTER TABLE "User" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "images_last_updated_at" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "all_images_last_updated_at" SET DATA TYPE TIMESTAMPTZ(3);
