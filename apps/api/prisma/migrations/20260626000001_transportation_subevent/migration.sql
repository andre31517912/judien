-- Add collectTransportation to Event
ALTER TABLE "Event" ADD COLUMN "collectTransportation" BOOLEAN NOT NULL DEFAULT false;

-- Add transportationMethod to RSVP
ALTER TABLE "RSVP" ADD COLUMN "transportationMethod" TEXT;

-- Create SubEvent table
CREATE TABLE "SubEvent" (
  "id"            TEXT NOT NULL,
  "parentEventId" TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT NOT NULL DEFAULT '',
  "maxCapacity"   INTEGER,
  "order"         INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubEvent_pkey" PRIMARY KEY ("id")
);

-- Create SubEventRSVP table
CREATE TABLE "SubEventRSVP" (
  "id"         TEXT NOT NULL,
  "subEventId" TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubEventRSVP_pkey" PRIMARY KEY ("id")
);

-- FK: SubEvent.parentEventId -> Event.id
ALTER TABLE "SubEvent"
  ADD CONSTRAINT "SubEvent_parentEventId_fkey"
  FOREIGN KEY ("parentEventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: SubEventRSVP.subEventId -> SubEvent.id
ALTER TABLE "SubEventRSVP"
  ADD CONSTRAINT "SubEventRSVP_subEventId_fkey"
  FOREIGN KEY ("subEventId") REFERENCES "SubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK: SubEventRSVP.userId -> User.id
ALTER TABLE "SubEventRSVP"
  ADD CONSTRAINT "SubEventRSVP_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "SubEvent_parentEventId_idx" ON "SubEvent"("parentEventId");
CREATE UNIQUE INDEX "SubEventRSVP_subEventId_userId_key" ON "SubEventRSVP"("subEventId", "userId");
CREATE INDEX "SubEventRSVP_subEventId_idx" ON "SubEventRSVP"("subEventId");
CREATE INDEX "SubEventRSVP_userId_idx" ON "SubEventRSVP"("userId");
