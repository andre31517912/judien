-- CreateTable
CREATE TABLE "DonationRecord" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "forUserId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonationRecord_groupId_idx" ON "DonationRecord"("groupId");

-- CreateIndex
CREATE INDEX "DonationRecord_forUserId_idx" ON "DonationRecord"("forUserId");

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_forUserId_fkey" FOREIGN KEY ("forUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationRecord" ADD CONSTRAINT "DonationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
