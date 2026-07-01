ALTER TABLE "Event"
ADD COLUMN "organizeGuestBatches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "guestListViewMode" TEXT NOT NULL DEFAULT 'FUSION';

CREATE TABLE "EventGuestBatchAssignment" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "entryKey" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EventGuestBatchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventGuestBatchAssignment_eventId_entryKey_key" ON "EventGuestBatchAssignment"("eventId", "entryKey");
CREATE INDEX "EventGuestBatchAssignment_eventId_idx" ON "EventGuestBatchAssignment"("eventId");

ALTER TABLE "EventGuestBatchAssignment"
ADD CONSTRAINT "EventGuestBatchAssignment_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
