-- CreateTable
CREATE TABLE "Refresh_Token" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,

    CONSTRAINT "Refresh_Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Refresh_Token_email_key" ON "Refresh_Token"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Refresh_Token_refresh_token_key" ON "Refresh_Token"("refresh_token");
