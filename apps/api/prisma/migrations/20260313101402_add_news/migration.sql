-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title_en" TEXT NOT NULL DEFAULT '',
    "title_zh" TEXT NOT NULL DEFAULT '',
    "body_en" TEXT NOT NULL DEFAULT '',
    "body_zh" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "News_createdAt_idx" ON "News"("createdAt");

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
