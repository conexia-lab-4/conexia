-- CreateEnum
CREATE TYPE "SubjectColor" AS ENUM ('BLUE', 'PURPLE', 'PINK', 'ORANGE', 'YELLOW', 'GREEN');

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "classroom" TEXT;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "color" "SubjectColor" NOT NULL DEFAULT 'BLUE',
ADD COLUMN     "visibleProfile" BOOLEAN NOT NULL DEFAULT true;
