-- Group relationship request workflow (pending approve/reject)

CREATE TABLE "GroupRelationshipRequest" (
  "id" TEXT NOT NULL,
  "sourceGroupId" TEXT NOT NULL,
  "targetGroupId" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupRelationshipRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GroupRelationshipRequest_source_idx" ON "GroupRelationshipRequest"("sourceGroupId", "status");
CREATE INDEX "GroupRelationshipRequest_target_idx" ON "GroupRelationshipRequest"("targetGroupId", "status");
CREATE INDEX "GroupRelationshipRequest_requester_idx" ON "GroupRelationshipRequest"("requesterUserId", "status");

CREATE UNIQUE INDEX "GroupRelationshipRequest_pending_unique"
ON "GroupRelationshipRequest" ("sourceGroupId", "targetGroupId", "status")
WHERE "status" = 'PENDING';

ALTER TABLE "GroupRelationshipRequest"
  ADD CONSTRAINT "GroupRelationshipRequest_source_fkey"
  FOREIGN KEY ("sourceGroupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupRelationshipRequest"
  ADD CONSTRAINT "GroupRelationshipRequest_target_fkey"
  FOREIGN KEY ("targetGroupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupRelationshipRequest"
  ADD CONSTRAINT "GroupRelationshipRequest_requester_fkey"
  FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupRelationshipRequest"
  ADD CONSTRAINT "GroupRelationshipRequest_reviewer_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
