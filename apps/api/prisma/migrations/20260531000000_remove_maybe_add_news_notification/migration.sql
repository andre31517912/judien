-- Migration: Remove MAYBE from RSVPStatus, add NEWS_PUBLISHED to NotificationType

-- 1. Convert all existing MAYBE RSVPs → NO
UPDATE "RSVP" SET status = 'NO' WHERE status = 'MAYBE';
UPDATE "GuestRSVP" SET status = 'NO' WHERE status = 'MAYBE';

-- 2. Replace RSVPStatus enum without MAYBE
ALTER TYPE "RSVPStatus" RENAME TO "RSVPStatus_old";
CREATE TYPE "RSVPStatus" AS ENUM ('GOING', 'NO');
ALTER TABLE "RSVP" ALTER COLUMN status TYPE "RSVPStatus" USING status::text::"RSVPStatus";
ALTER TABLE "GuestRSVP" ALTER COLUMN status TYPE "RSVPStatus" USING status::text::"RSVPStatus";
DROP TYPE "RSVPStatus_old";

-- 3. Add NEWS_PUBLISHED to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'NEWS_PUBLISHED';
