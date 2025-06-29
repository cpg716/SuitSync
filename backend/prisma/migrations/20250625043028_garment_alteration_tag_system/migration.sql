/*
  Warnings:

  - The `status` column on the `AlterationJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `AlterationJobPart` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[jobNumber]` on the table `AlterationJob` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCode]` on the table `AlterationJob` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrCode]` on the table `AlterationJobPart` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jobNumber` to the `AlterationJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qrCode` to the `AlterationJob` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partType` to the `AlterationJobPart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qrCode` to the `AlterationJobPart` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AlterationJobStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'PICKED_UP', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ORDERED', 'IN_STOCK', 'ALTERATION_ONLY');

-- CreateEnum
CREATE TYPE "GarmentPartType" AS ENUM ('JACKET', 'PANTS', 'VEST', 'SHIRT', 'DRESS', 'SKIRT', 'OTHER');

-- CreateEnum
CREATE TYPE "PartPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'RUSH');

-- CreateEnum
CREATE TYPE "WorkflowStepType" AS ENUM ('MEASURED', 'SUIT_ORDERED', 'SUIT_ARRIVED', 'ALTERATIONS_MARKED', 'COMPLETE', 'QC_CHECKED', 'READY_FOR_PICKUP', 'PICKED_UP');

-- CreateEnum
CREATE TYPE "QRScanType" AS ENUM ('START_WORK', 'FINISH_WORK', 'PICKUP', 'STATUS_CHECK', 'QUALITY_CHECK');

-- DropForeignKey
ALTER TABLE "AlterationJobPart" DROP CONSTRAINT "AlterationJobPart_jobId_fkey";

-- AlterTable
ALTER TABLE "AlterationJob" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "jobNumber" TEXT NOT NULL,
ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL DEFAULT 'ALTERATION_ONLY',
ADD COLUMN     "qrCode" TEXT NOT NULL,
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "rushOrder" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "status",
ADD COLUMN     "status" "AlterationJobStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- AlterTable
ALTER TABLE "AlterationJobPart" ADD COLUMN     "estimatedTime" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "partType" "GarmentPartType" NOT NULL,
ADD COLUMN     "priority" "PartPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "qrCode" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AlterationJobStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- CreateTable
CREATE TABLE "AlterationTask" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "taskName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" "AlterationJobStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "startTime" TIMESTAMP(3),
    "finishTime" TIMESTAMP(3),
    "assignedTo" INTEGER,
    "timeSpent" INTEGER,
    "initials" TEXT,
    "notes" TEXT,
    "measurements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterationTaskLog" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AlterationTaskLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterationWorkflowStep" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" "WorkflowStepType" NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" INTEGER,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterationWorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRScanLog" (
    "id" SERIAL NOT NULL,
    "qrCode" TEXT NOT NULL,
    "partId" INTEGER,
    "scannedBy" INTEGER NOT NULL,
    "scanType" "QRScanType" NOT NULL,
    "location" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "result" TEXT,

    CONSTRAINT "QRScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlterationTask_partId_idx" ON "AlterationTask"("partId");

-- CreateIndex
CREATE INDEX "AlterationTask_assignedTo_idx" ON "AlterationTask"("assignedTo");

-- CreateIndex
CREATE INDEX "AlterationTask_status_idx" ON "AlterationTask"("status");

-- CreateIndex
CREATE INDEX "AlterationTaskLog_taskId_idx" ON "AlterationTaskLog"("taskId");

-- CreateIndex
CREATE INDEX "AlterationTaskLog_userId_idx" ON "AlterationTaskLog"("userId");

-- CreateIndex
CREATE INDEX "AlterationTaskLog_timestamp_idx" ON "AlterationTaskLog"("timestamp");

-- CreateIndex
CREATE INDEX "AlterationWorkflowStep_jobId_idx" ON "AlterationWorkflowStep"("jobId");

-- CreateIndex
CREATE INDEX "AlterationWorkflowStep_stepType_idx" ON "AlterationWorkflowStep"("stepType");

-- CreateIndex
CREATE INDEX "QRScanLog_qrCode_idx" ON "QRScanLog"("qrCode");

-- CreateIndex
CREATE INDEX "QRScanLog_partId_idx" ON "QRScanLog"("partId");

-- CreateIndex
CREATE INDEX "QRScanLog_scannedBy_idx" ON "QRScanLog"("scannedBy");

-- CreateIndex
CREATE INDEX "QRScanLog_timestamp_idx" ON "QRScanLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AlterationJob_jobNumber_key" ON "AlterationJob"("jobNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AlterationJob_qrCode_key" ON "AlterationJob"("qrCode");

-- CreateIndex
CREATE INDEX "AlterationJob_jobNumber_idx" ON "AlterationJob"("jobNumber");

-- CreateIndex
CREATE INDEX "AlterationJob_qrCode_idx" ON "AlterationJob"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "AlterationJobPart_qrCode_key" ON "AlterationJobPart"("qrCode");

-- CreateIndex
CREATE INDEX "AlterationJobPart_qrCode_idx" ON "AlterationJobPart"("qrCode");

-- CreateIndex
CREATE INDEX "AlterationJobPart_status_idx" ON "AlterationJobPart"("status");

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AlterationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationTask" ADD CONSTRAINT "AlterationTask_partId_fkey" FOREIGN KEY ("partId") REFERENCES "AlterationJobPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationTask" ADD CONSTRAINT "AlterationTask_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationTaskLog" ADD CONSTRAINT "AlterationTaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AlterationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationTaskLog" ADD CONSTRAINT "AlterationTaskLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationWorkflowStep" ADD CONSTRAINT "AlterationWorkflowStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AlterationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationWorkflowStep" ADD CONSTRAINT "AlterationWorkflowStep_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRScanLog" ADD CONSTRAINT "QRScanLog_partId_fkey" FOREIGN KEY ("partId") REFERENCES "AlterationJobPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRScanLog" ADD CONSTRAINT "QRScanLog_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
