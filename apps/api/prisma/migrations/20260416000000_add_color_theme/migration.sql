-- AddColumn colorTheme to User
ALTER TABLE "User" ADD COLUMN "colorTheme" TEXT NOT NULL DEFAULT 'light';
