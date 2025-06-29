-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('fitting', 'pickup', 'final_try', 'other');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'rescheduled', 'canceled', 'completed');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'failed');

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "measurements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "customerId" INTEGER NOT NULL,
    "externalId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "syncedToLs" BOOLEAN NOT NULL DEFAULT false,
    "lsPartyId" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterationJob" (
    "id" SERIAL NOT NULL,
    "saleLineItemId" INTEGER NOT NULL,
    "partyId" INTEGER,
    "customerId" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "timeSpentMinutes" INTEGER,
    "tailorId" INTEGER,
    "measurements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "type" "AppointmentType" DEFAULT 'fitting',
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "syncedToLightspeed" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "memberId" INTEGER,
    "tailorId" INTEGER,
    "lsEventId" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "appointmentId" INTEGER NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyMember" (
    "id" SERIAL NOT NULL,
    "partyId" INTEGER NOT NULL,
    "lsCustomerId" TEXT,
    "role" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Selected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "measurements" JSONB,

    CONSTRAINT "PartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleAssignment" (
    "id" SERIAL NOT NULL,
    "saleId" TEXT NOT NULL,
    "associateId" INTEGER NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "reminderIntervals" TEXT NOT NULL DEFAULT '24,4',
    "emailSubject" TEXT NOT NULL DEFAULT 'Reminder: Your appointment at {shopName}',
    "emailBody" TEXT NOT NULL DEFAULT 'Hi {customerName},
This is a reminder for your appointment with {partyName} on {dateTime}.',
    "smsBody" TEXT NOT NULL DEFAULT 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterationTaskType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "parts" TEXT NOT NULL,

    CONSTRAINT "AlterationTaskType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailorAbility" (
    "id" SERIAL NOT NULL,
    "tailorId" INTEGER NOT NULL,
    "taskTypeId" INTEGER NOT NULL,
    "proficiency" INTEGER NOT NULL,

    CONSTRAINT "TailorAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailorSchedule" (
    "id" SERIAL NOT NULL,
    "tailorId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "TailorSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlterationJobPart" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "part" TEXT NOT NULL,
    "taskTypeId" INTEGER NOT NULL,
    "assignedTailorId" INTEGER,
    "scheduledTime" TIMESTAMP(3),
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlterationJobPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" SERIAL NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SkillToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Party_customerId_idx" ON "Party"("customerId");

-- CreateIndex
CREATE INDEX "AlterationJob_partyId_idx" ON "AlterationJob"("partyId");

-- CreateIndex
CREATE INDEX "AlterationJob_customerId_idx" ON "AlterationJob"("customerId");

-- CreateIndex
CREATE INDEX "AlterationJob_tailorId_idx" ON "AlterationJob"("tailorId");

-- CreateIndex
CREATE INDEX "Appointment_partyId_idx" ON "Appointment"("partyId");

-- CreateIndex
CREATE INDEX "Appointment_parentId_idx" ON "Appointment"("parentId");

-- CreateIndex
CREATE INDEX "Appointment_memberId_idx" ON "Appointment"("memberId");

-- CreateIndex
CREATE INDEX "Appointment_tailorId_idx" ON "Appointment"("tailorId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AlterationTaskType_name_key" ON "AlterationTaskType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "_SkillToUser_AB_unique" ON "_SkillToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_SkillToUser_B_index" ON "_SkillToUser"("B");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJob" ADD CONSTRAINT "AlterationJob_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJob" ADD CONSTRAINT "AlterationJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJob" ADD CONSTRAINT "AlterationJob_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PartyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMember" ADD CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAssignment" ADD CONSTRAINT "SaleAssignment_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorAbility" ADD CONSTRAINT "TailorAbility_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorAbility" ADD CONSTRAINT "TailorAbility_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "AlterationTaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TailorSchedule" ADD CONSTRAINT "TailorSchedule_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AlterationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "AlterationTaskType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_assignedTailorId_fkey" FOREIGN KEY ("assignedTailorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToUser" ADD CONSTRAINT "_SkillToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkillToUser" ADD CONSTRAINT "_SkillToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
