/*
  Warnings:

  - You are about to drop the column `creation_date` on the `Album` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Album" DROP COLUMN "creation_date",
ALTER COLUMN "created_at" DROP NOT NULL;
