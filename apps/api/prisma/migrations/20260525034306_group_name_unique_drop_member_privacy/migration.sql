/*
  Warnings:

  - You are about to drop the column `memberDataPrivate` on the `Group` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `Group` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Group_name_idx";

-- AlterTable
ALTER TABLE "Group" DROP COLUMN "memberDataPrivate";

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");
