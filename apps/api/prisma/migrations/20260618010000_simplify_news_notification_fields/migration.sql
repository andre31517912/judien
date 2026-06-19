-- News
ALTER TABLE "News" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
UPDATE "News" SET "title" = "title_en";
ALTER TABLE "News" ADD COLUMN "body" TEXT NOT NULL DEFAULT '';
UPDATE "News" SET "body" = "body_en";
ALTER TABLE "News" DROP COLUMN "title_en";
ALTER TABLE "News" DROP COLUMN "title_zh";
ALTER TABLE "News" DROP COLUMN "body_en";
ALTER TABLE "News" DROP COLUMN "body_zh";

-- Notification
ALTER TABLE "Notification" ADD COLUMN "title" TEXT;
UPDATE "Notification" SET "title" = "title_en";
ALTER TABLE "Notification" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "body" TEXT NOT NULL DEFAULT '';
UPDATE "Notification" SET "body" = "body_en";
ALTER TABLE "Notification" DROP COLUMN "title_en";
ALTER TABLE "Notification" DROP COLUMN "title_zh";
ALTER TABLE "Notification" DROP COLUMN "body_en";
ALTER TABLE "Notification" DROP COLUMN "body_zh";
