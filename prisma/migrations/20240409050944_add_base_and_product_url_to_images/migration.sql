/*
  Warnings:

  - A unique constraint covering the columns `[base_url]` on the table `Images` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_url]` on the table `Images` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Images" ADD COLUMN     "base_url" TEXT,
ADD COLUMN     "base_url_last_updated" TIMESTAMP(3),
ADD COLUMN     "product_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Images_base_url_key" ON "Images"("base_url");

-- CreateIndex
CREATE UNIQUE INDEX "Images_product_url_key" ON "Images"("product_url");
