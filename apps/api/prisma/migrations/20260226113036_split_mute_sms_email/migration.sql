/*
  Warnings:

  - You are about to drop the column `notificationsMuted` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "notificationsMuted",
ADD COLUMN     "muteEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "muteSms" BOOLEAN NOT NULL DEFAULT false;
