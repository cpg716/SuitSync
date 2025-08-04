-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('appointment_reminder_24h', 'appointment_reminder_3h', 'appointment_reminder_1h', 'pickup_ready');

-- CreateEnum
CREATE TYPE "NotificationMethod" AS ENUM ('email', 'sms', 'both');

-- CreateEnum
CREATE TYPE "ChecklistFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');

-- AlterEnum
ALTER TYPE "AlterationJobStatus" ADD VALUE 'pending';

-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'confirmed';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentType" ADD VALUE 'first_fitting';
ALTER TYPE "AppointmentType" ADD VALUE 'alterations_fitting';

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_partyId_fkey";

-- DropIndex
DROP INDEX "Customer_email_key";

-- AlterTable
ALTER TABLE "AlterationJob" ALTER COLUMN "qrCode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "autoScheduleNext" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "individualCustomerId" INTEGER,
ADD COLUMN     "nextAppointmentId" INTEGER,
ADD COLUMN     "remindersScheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remindersSent" JSONB,
ADD COLUMN     "workflowStage" INTEGER DEFAULT 1,
ALTER COLUMN "partyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "afternoonCutoff" TEXT,
ADD COLUMN     "earlyMorningCutoff" TEXT,
ADD COLUMN     "lateMorningCutoff" TEXT,
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

-- CreateTable
CREATE TABLE "Checklist" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "ChecklistFrequency" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "estimatedMinutes" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistAssignment" (
    "id" SERIAL NOT NULL,
    "checklistId" INTEGER NOT NULL,
    "assignedToId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ChecklistAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistExecution" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItemExecution" (
    "id" SERIAL NOT NULL,
    "executionId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "estimatedMinutes" INTEGER,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCustomField" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CustomerTags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CustomerTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CustomerGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CustomerGroups_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "NotificationSchedule_scheduledFor_sent_idx" ON "NotificationSchedule"("scheduledFor", "sent");

-- CreateIndex
CREATE INDEX "NotificationSchedule_appointmentId_idx" ON "NotificationSchedule"("appointmentId");

-- CreateIndex
CREATE INDEX "Checklist_createdById_idx" ON "Checklist"("createdById");

-- CreateIndex
CREATE INDEX "Checklist_frequency_idx" ON "Checklist"("frequency");

-- CreateIndex
CREATE INDEX "Checklist_isActive_idx" ON "Checklist"("isActive");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistItem_order_idx" ON "ChecklistItem"("order");

-- CreateIndex
CREATE INDEX "ChecklistAssignment_assignedToId_idx" ON "ChecklistAssignment"("assignedToId");

-- CreateIndex
CREATE INDEX "ChecklistAssignment_checklistId_idx" ON "ChecklistAssignment"("checklistId");

-- CreateIndex
CREATE INDEX "ChecklistAssignment_assignedById_idx" ON "ChecklistAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "ChecklistExecution_userId_scheduledFor_idx" ON "ChecklistExecution"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "ChecklistExecution_assignmentId_idx" ON "ChecklistExecution"("assignmentId");

-- CreateIndex
CREATE INDEX "ChecklistExecution_status_idx" ON "ChecklistExecution"("status");

-- CreateIndex
CREATE INDEX "ChecklistItemExecution_executionId_idx" ON "ChecklistItemExecution"("executionId");

-- CreateIndex
CREATE INDEX "ChecklistItemExecution_itemId_idx" ON "ChecklistItemExecution"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemExecution_executionId_itemId_key" ON "ChecklistItemExecution"("executionId", "itemId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_status_idx" ON "Task"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "Task_assignedById_idx" ON "Task"("assignedById");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_priority_idx" ON "Task"("priority");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_name_key" ON "CustomerTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCustomField_customerId_key_key" ON "CustomerCustomField"("customerId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerGroup_name_externalId_key" ON "CustomerGroup"("name", "externalId");

-- CreateIndex
CREATE INDEX "_CustomerTags_B_index" ON "_CustomerTags"("B");

-- CreateIndex
CREATE INDEX "_CustomerGroups_B_index" ON "_CustomerGroups"("B");

-- CreateIndex
CREATE INDEX "User_pinHash_idx" ON "User"("pinHash");

-- CreateIndex
CREATE INDEX "User_pinLockedUntil_idx" ON "User"("pinLockedUntil");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_nextAppointmentId_fkey" FOREIGN KEY ("nextAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_individualCustomerId_fkey" FOREIGN KEY ("individualCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSchedule" ADD CONSTRAINT "NotificationSchedule_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checklist" ADD CONSTRAINT "Checklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAssignment" ADD CONSTRAINT "ChecklistAssignment_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAssignment" ADD CONSTRAINT "ChecklistAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAssignment" ADD CONSTRAINT "ChecklistAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistExecution" ADD CONSTRAINT "ChecklistExecution_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ChecklistAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistExecution" ADD CONSTRAINT "ChecklistExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemExecution" ADD CONSTRAINT "ChecklistItemExecution_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "ChecklistExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemExecution" ADD CONSTRAINT "ChecklistItemExecution_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerCustomField" ADD CONSTRAINT "CustomerCustomField_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerTags" ADD CONSTRAINT "_CustomerTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerTags" ADD CONSTRAINT "_CustomerTags_B_fkey" FOREIGN KEY ("B") REFERENCES "CustomerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerGroups" ADD CONSTRAINT "_CustomerGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerGroups" ADD CONSTRAINT "_CustomerGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "CustomerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
