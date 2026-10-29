-- CreateEnum
CREATE TYPE "RouteDirection" AS ENUM ('TO_CAMPUS', 'FROM_CAMPUS');

-- AlterTable
ALTER TABLE "TravelIntent" ADD COLUMN     "campusId" TEXT,
ADD COLUMN     "routeDirection" "RouteDirection";

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "campusId" TEXT,
ADD COLUMN     "routeDirection" "RouteDirection";

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelIntent" ADD CONSTRAINT "TravelIntent_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
