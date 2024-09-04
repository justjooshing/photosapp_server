-- CreateIndex
CREATE INDEX "Album_userId_idx" ON "Album"("userId");

-- CreateIndex
CREATE INDEX "Image_Sets_userId_idx" ON "Image_Sets"("userId");

-- CreateIndex
CREATE INDEX "Images_userId_idx" ON "Images"("userId");

-- CreateIndex
CREATE INDEX "Refresh_Token_email_idx" ON "Refresh_Token"("email");
