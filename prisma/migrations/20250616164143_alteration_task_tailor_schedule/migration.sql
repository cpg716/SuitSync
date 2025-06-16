-- CreateTable
CREATE TABLE "AlterationTaskType" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "defaultDuration" INTEGER NOT NULL,
    "parts" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TailorAbility" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tailorId" INTEGER NOT NULL,
    "taskTypeId" INTEGER NOT NULL,
    "proficiency" INTEGER NOT NULL,
    CONSTRAINT "TailorAbility_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TailorAbility_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "AlterationTaskType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TailorSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tailorId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "TailorSchedule_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AlterationJobPart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "part" TEXT NOT NULL,
    "taskTypeId" INTEGER NOT NULL,
    "assignedTailorId" INTEGER,
    "scheduledTime" DATETIME,
    "duration" INTEGER,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlterationJobPart_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AlterationJob" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlterationJobPart_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "AlterationTaskType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AlterationJobPart_assignedTailorId_fkey" FOREIGN KEY ("assignedTailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AlterationTaskType_name_key" ON "AlterationTaskType"("name");
