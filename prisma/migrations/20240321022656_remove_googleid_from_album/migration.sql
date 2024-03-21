/*
  Warnings:

  - You are about to drop the column `googleId` on the `Album` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Album_googleId_key";

-- AlterTable
ALTER TABLE "Album" DROP COLUMN "googleId";
