-- Make rsvpId nullable to allow creator-added roster guests (not tied to any RSVP)
ALTER TABLE "RSVPPlusOne" ALTER COLUMN "rsvpId" DROP NOT NULL;
