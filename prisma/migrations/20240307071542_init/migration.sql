/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Images` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleProfilePicture]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Images_created_at_key";

-- CreateIndex
CREATE UNIQUE INDEX "Images_userId_key" ON "Images"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleProfilePicture_key" ON "User"("googleProfilePicture");
