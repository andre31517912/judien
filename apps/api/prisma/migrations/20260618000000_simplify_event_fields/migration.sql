-- Add new simplified columns with data copied from English variants
ALTER TABLE "Event" ADD COLUMN "title" TEXT;
UPDATE "Event" SET "title" = "title_en";
ALTER TABLE "Event" ALTER COLUMN "title" SET NOT NULL;

ALTER TABLE "Event" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
UPDATE "Event" SET "description" = "description_en";

ALTER TABLE "Event" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';
UPDATE "Event" SET "location" = "location_en";

-- Drop old localized columns from Event
ALTER TABLE "Event" DROP COLUMN "title_en";
ALTER TABLE "Event" DROP COLUMN "title_zh";
ALTER TABLE "Event" DROP COLUMN "description_en";
ALTER TABLE "Event" DROP COLUMN "description_zh";
ALTER TABLE "Event" DROP COLUMN "location_en";
ALTER TABLE "Event" DROP COLUMN "location_zh";

-- EventSeries
ALTER TABLE "EventSeries" ADD COLUMN "title" TEXT;
UPDATE "EventSeries" SET "title" = "title_en";
ALTER TABLE "EventSeries" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "EventSeries" DROP COLUMN "title_en";
ALTER TABLE "EventSeries" DROP COLUMN "title_zh";
