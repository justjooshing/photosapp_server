-- AlterTable
ALTER TABLE "Images" ALTER COLUMN "deleted_at" DROP NOT NULL,
ALTER COLUMN "sorted_at" DROP NOT NULL;
