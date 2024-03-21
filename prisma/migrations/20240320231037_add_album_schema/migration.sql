-- AlterTable
ALTER TABLE "Images" ADD COLUMN     "deleted_album_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "images_last_updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Album" (
    "id" SERIAL NOT NULL,
    "googleId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "creation_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Album_googleId_key" ON "Album"("googleId");

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_deleted_album_id_fkey" FOREIGN KEY ("deleted_album_id") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Album" ADD CONSTRAINT "Album_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
