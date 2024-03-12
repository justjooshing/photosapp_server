/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `Images` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Images_photoUrl_key";

-- AlterTable
ALTER TABLE "Images" DROP COLUMN "photoUrl";
