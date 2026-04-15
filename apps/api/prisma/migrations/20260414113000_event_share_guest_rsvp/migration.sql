-- CreateTable
CREATE TABLE "EventShareLink" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestRSVP" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "identityHash" TEXT NOT NULL,
    "status" "RSVPStatus" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestRSVP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventShareLink_eventId_key" ON "EventShareLink"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventShareLink_token_key" ON "EventShareLink"("token");

-- CreateIndex
CREATE INDEX "EventShareLink_createdById_idx" ON "EventShareLink"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "GuestRSVP_eventId_identityHash_key" ON "GuestRSVP"("eventId", "identityHash");

-- CreateIndex
CREATE INDEX "GuestRSVP_eventId_idx" ON "GuestRSVP"("eventId");

-- AddForeignKey
ALTER TABLE "EventShareLink" ADD CONSTRAINT "EventShareLink_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventShareLink" ADD CONSTRAINT "EventShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestRSVP" ADD CONSTRAINT "GuestRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
