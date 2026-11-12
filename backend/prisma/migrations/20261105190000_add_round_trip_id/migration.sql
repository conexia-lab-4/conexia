-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "roundTripId" TEXT;

-- AlterTable
ALTER TABLE "TravelIntent" ADD COLUMN     "roundTripId" TEXT;

-- CreateIndex
CREATE INDEX "Trip_roundTripId_idx" ON "Trip"("roundTripId");

-- CreateIndex
CREATE INDEX "TravelIntent_roundTripId_idx" ON "TravelIntent"("roundTripId");
