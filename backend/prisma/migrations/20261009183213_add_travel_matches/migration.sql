-- CreateEnum
CREATE TYPE "TravelMatchStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'INVALIDATED');

-- CreateTable
CREATE TABLE "TravelMatch" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "travelIntentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "detourKm" DOUBLE PRECISION NOT NULL,
    "departureDeltaMinutes" DOUBLE PRECISION NOT NULL,
    "arrivalDeltaMinutes" DOUBLE PRECISION NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "status" "TravelMatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelMatch_travelIntentId_idx" ON "TravelMatch"("travelIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelMatch_tripId_travelIntentId_key" ON "TravelMatch"("tripId", "travelIntentId");

-- AddForeignKey
ALTER TABLE "TravelMatch" ADD CONSTRAINT "TravelMatch_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelMatch" ADD CONSTRAINT "TravelMatch_travelIntentId_fkey" FOREIGN KEY ("travelIntentId") REFERENCES "TravelIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
