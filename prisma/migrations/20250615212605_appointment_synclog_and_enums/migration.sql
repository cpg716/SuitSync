/*
  Warnings:

  - You are about to drop the column `duration` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `endDatetime` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `syncedAt` on the `Appointment` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appointmentId" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "customerId" TEXT,
    "saleId" TEXT,
    "dateTime" DATETIME NOT NULL,
    "durationMinutes" INTEGER,
    "type" TEXT DEFAULT 'fitting',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "syncedToLightspeed" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "memberId" INTEGER,
    "tailorId" INTEGER,
    "lsEventId" TEXT,
    CONSTRAINT "Appointment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PartyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "dateTime", "id", "lsEventId", "memberId", "notes", "partyId", "status", "tailorId", "type", "updatedAt") SELECT "createdAt", "dateTime", "id", "lsEventId", "memberId", "notes", "partyId", "status", "tailorId", "type", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
