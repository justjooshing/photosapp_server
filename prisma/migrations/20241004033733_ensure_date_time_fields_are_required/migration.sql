/*
  Warnings:

  - Made the column `created_at` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `images_last_updated_at` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `all_images_last_updated_at` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "images_last_updated_at" SET NOT NULL,
ALTER COLUMN "all_images_last_updated_at" SET NOT NULL;
