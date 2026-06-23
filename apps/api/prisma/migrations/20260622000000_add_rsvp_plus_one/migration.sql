-- CreateTable
CREATE TABLE "RSVPPlusOne" (
    "id" TEXT NOT NULL,
    "rsvpId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "relationship" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RSVPPlusOne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RSVPPlusOne_rsvpId_idx" ON "RSVPPlusOne"("rsvpId");

-- CreateIndex
CREATE INDEX "RSVPPlusOne_eventId_idx" ON "RSVPPlusOne"("eventId");

-- AddForeignKey
ALTER TABLE "RSVPPlusOne" ADD CONSTRAINT "RSVPPlusOne_rsvpId_fkey" FOREIGN KEY ("rsvpId") REFERENCES "RSVP"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RSVPPlusOne" ADD CONSTRAINT "RSVPPlusOne_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
