/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventKey]` on the table `Notification` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MATCH';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_eventKey_key" ON "Notification"("userId", "eventKey");
