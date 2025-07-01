-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('appointment_reminder_24h', 'appointment_reminder_3h', 'appointment_reminder_1h', 'pickup_ready');

-- CreateEnum
CREATE TYPE "NotificationMethod" AS ENUM ('email', 'sms', 'both');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentType" ADD VALUE 'first_fitting';
ALTER TYPE "AppointmentType" ADD VALUE 'alterations_fitting';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "autoScheduleNext" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "individualCustomerId" INTEGER,
ADD COLUMN     "nextAppointmentId" INTEGER,
ADD COLUMN     "remindersScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindersSent" JSONB,
ADD COLUMN     "workflowStage" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "earlyMorningCutoff" TEXT NOT NULL DEFAULT '09:30',
ADD COLUMN     "pickupReadyEmail" TEXT NOT NULL DEFAULT 'Hi {customerName},
Your garment for {partyName} is ready for pickup!',
ADD COLUMN     "pickupReadySms" TEXT NOT NULL DEFAULT 'Your garment for {partyName} is ready for pickup at {shopName}!',
ADD COLUMN     "pickupReadySubject" TEXT NOT NULL DEFAULT 'Your garment is ready for pickup!';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastPinUse" TIMESTAMP(3),
ADD COLUMN     "pinAttempts" INTEGER DEFAULT 0,
ADD COLUMN     "pinHash" TEXT,
ADD COLUMN     "pinLockedUntil" TIMESTAMP(3),
ADD COLUMN     "pinSetAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NotificationSchedule" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "method" "NotificationMethod" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationSchedule_scheduledFor_sent_idx" ON "NotificationSchedule"("scheduledFor", "sent");

-- CreateIndex
CREATE INDEX "NotificationSchedule_appointmentId_idx" ON "NotificationSchedule"("appointmentId");

-- CreateIndex
CREATE INDEX "User_pinHash_idx" ON "User"("pinHash");

-- CreateIndex
CREATE INDEX "User_pinLockedUntil_idx" ON "User"("pinLockedUntil");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_nextAppointmentId_fkey" FOREIGN KEY ("nextAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_individualCustomerId_fkey" FOREIGN KEY ("individualCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSchedule" ADD CONSTRAINT "NotificationSchedule_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
