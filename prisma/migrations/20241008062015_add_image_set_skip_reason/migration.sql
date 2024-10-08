-- CreateEnum
CREATE TYPE "SkipReason" AS ENUM ('SKIP', 'INACCURATE');

-- AlterTable
ALTER TABLE "Image_Sets" ADD COLUMN     "skip_reason" "SkipReason";
