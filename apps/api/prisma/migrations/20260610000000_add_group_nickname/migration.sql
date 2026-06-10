-- Add per-membership in-group display name (nickname)
ALTER TABLE "GroupMembership" ADD COLUMN "groupNickname" TEXT;
