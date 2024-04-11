/*
  Warnings:

  - You are about to drop the column `base_url` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `base_url_last_updated` on the `Images` table. All the data in the column will be lost.
  - You are about to drop the column `product_url` on the `Images` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[baseUrl]` on the table `Images` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productUrl]` on the table `Images` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Images_base_url_key";

-- DropIndex
DROP INDEX "Images_product_url_key";

-- AlterTable
ALTER TABLE "Images" DROP COLUMN "base_url",
DROP COLUMN "base_url_last_updated",
DROP COLUMN "product_url",
ADD COLUMN     "baseUrl" TEXT,
ADD COLUMN     "baseUrl_last_updated" TIMESTAMP(3),
ADD COLUMN     "productUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Images_baseUrl_key" ON "Images"("baseUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Images_productUrl_key" ON "Images"("productUrl");
