-- AlterEnum
ALTER TYPE "TravelMatchStatus" ADD VALUE 'REJECTED';

-- CreateTable
CREATE TABLE "DailyMetric" (
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("date","metric")
);

-- CreateTable
CREATE TABLE "KpiEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KpiEvent_type_occurredAt_idx" ON "KpiEvent"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "KpiEvent_type_refId_userId_key" ON "KpiEvent"("type", "refId", "userId");
