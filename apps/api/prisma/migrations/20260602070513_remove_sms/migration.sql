/*
  Warnings:

  - The values [SMS] on the enum `MessageChannel` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `muteSms` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MessageChannel_new" AS ENUM ('EMAIL', 'LINE');
ALTER TABLE "MessageLog" ALTER COLUMN "channel" TYPE "MessageChannel_new" USING ("channel"::text::"MessageChannel_new");
ALTER TYPE "MessageChannel" RENAME TO "MessageChannel_old";
ALTER TYPE "MessageChannel_new" RENAME TO "MessageChannel";
DROP TYPE "MessageChannel_old";
COMMIT;

-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "discoverableBySearch" SET DEFAULT true;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "muteSms";
