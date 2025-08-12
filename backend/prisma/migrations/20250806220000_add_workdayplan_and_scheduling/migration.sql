-- Add WorkDayPlan table and link AlterationJobPart to daily plans

-- CreateTable
CREATE TABLE "WorkDayPlan" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "jacketCapacity" INTEGER NOT NULL DEFAULT 28,
    "pantsCapacity" INTEGER NOT NULL DEFAULT 24,
    "assignedJackets" INTEGER NOT NULL DEFAULT 0,
    "assignedPants" INTEGER NOT NULL DEFAULT 0,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkDayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkDayPlan_date_key" ON "WorkDayPlan"("date");

-- AlterTable: add scheduling fields to AlterationJobPart
ALTER TABLE "AlterationJobPart"
ADD COLUMN "scheduledFor" TIMESTAMP(3),
ADD COLUMN "workDayId" INTEGER;

-- Indexes on new fields
CREATE INDEX "AlterationJobPart_scheduledFor_idx" ON "AlterationJobPart"("scheduledFor");
CREATE INDEX "AlterationJobPart_workDayId_idx" ON "AlterationJobPart"("workDayId");

-- Foreign key
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_workDayId_fkey"
FOREIGN KEY ("workDayId") REFERENCES "WorkDayPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;


