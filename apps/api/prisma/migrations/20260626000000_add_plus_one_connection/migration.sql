-- Add addedByUserId: tracks who added a guest when they aren't RSVPed GOING
ALTER TABLE "RSVPPlusOne" ADD COLUMN "addedByUserId" TEXT;

-- Add connectedInviteeName: the invited person this outside guest is connected to
ALTER TABLE "RSVPPlusOne" ADD COLUMN "connectedInviteeName" TEXT;

-- FK from addedByUserId to User (set null on user delete)
ALTER TABLE "RSVPPlusOne"
  ADD CONSTRAINT "RSVPPlusOne_addedByUserId_fkey"
  FOREIGN KEY ("addedByUserId")
  REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for efficient lookup by adder
CREATE INDEX "RSVPPlusOne_addedByUserId_idx" ON "RSVPPlusOne"("addedByUserId");
