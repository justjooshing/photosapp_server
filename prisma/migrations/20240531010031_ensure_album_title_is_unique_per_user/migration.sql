/*
  Warnings:

  - A unique constraint covering the columns `[userId,title]` on the table `Album` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Album_userId_title_key" ON "Album"("userId", "title");
