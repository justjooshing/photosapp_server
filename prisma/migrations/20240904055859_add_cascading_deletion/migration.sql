-- DropForeignKey
ALTER TABLE "Album" DROP CONSTRAINT "Album_userId_fkey";

-- DropForeignKey
ALTER TABLE "Image_Sets" DROP CONSTRAINT "Image_Sets_userId_fkey";

-- DropForeignKey
ALTER TABLE "Images" DROP CONSTRAINT "Images_userId_fkey";

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image_Sets" ADD CONSTRAINT "Image_Sets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
