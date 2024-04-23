/*
  Warnings:

  - You are about to drop the column `mimeType` on the `Images` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Images" DROP COLUMN "mimeType",
ADD COLUMN     "mime_type" TEXT;
