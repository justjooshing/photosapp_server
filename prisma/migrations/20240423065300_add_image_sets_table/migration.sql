-- AlterTable
ALTER TABLE "Images" ADD COLUMN     "imageSetId" INTEGER;

-- CreateTable
CREATE TABLE "Image_Sets" (
    "id" SERIAL NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "image_ids" INTEGER[],

    CONSTRAINT "Image_Sets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_imageSetId_fkey" FOREIGN KEY ("imageSetId") REFERENCES "Image_Sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image_Sets" ADD CONSTRAINT "Image_Sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
