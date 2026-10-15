-- AlterTable
ALTER TABLE "TripPassenger" ADD COLUMN     "dropoffAddress" TEXT,
ADD COLUMN     "dropoffLat" DOUBLE PRECISION,
ADD COLUMN     "dropoffLng" DOUBLE PRECISION,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION;

UPDATE "TripPassenger" AS tp
SET "pickupAddress" = ti."origin",
    "pickupLat" = ti."originLat",
    "pickupLng" = ti."originLng",
    "dropoffAddress" = ti."destination",
    "dropoffLat" = ti."destinationLat",
    "dropoffLng" = ti."destinationLng"
    FROM "TravelMatch" tm
JOIN "TravelIntent" ti ON ti."id" = tm."travelIntentId"
WHERE tm."status" = 'ACCEPTED'
  AND tm."tripId" = tp."tripId"
  AND ti."userId" = tp."userId"
  AND tp."pickupAddress" IS NULL;
