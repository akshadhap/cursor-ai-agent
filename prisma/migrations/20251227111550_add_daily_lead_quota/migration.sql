-- CreateTable
CREATE TABLE "DailyLeadQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLeadQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLeadQuota_userId_idx" ON "DailyLeadQuota"("userId");

-- CreateIndex
CREATE INDEX "DailyLeadQuota_date_idx" ON "DailyLeadQuota"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLeadQuota_userId_date_key" ON "DailyLeadQuota"("userId", "date");
