-- CreateEnum
CREATE TYPE "TravelIntentStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "TravelIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION NOT NULL,
    "originLng" DOUBLE PRECISION NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLng" DOUBLE PRECISION NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "arrivalTime" TIMESTAMP(3) NOT NULL,
    "status" "TravelIntentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelIntent_userId_status_idx" ON "TravelIntent"("userId", "status");

-- CreateIndex
CREATE INDEX "TravelIntent_status_departureTime_idx" ON "TravelIntent"("status", "departureTime");

-- AddForeignKey
ALTER TABLE "TravelIntent" ADD CONSTRAINT "TravelIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
