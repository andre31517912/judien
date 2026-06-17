-- Add appleUserId field for Sign in with Apple (mobile)
ALTER TABLE "User" ADD COLUMN "appleUserId" TEXT;
CREATE UNIQUE INDEX "User_appleUserId_key" ON "User"("appleUserId");
