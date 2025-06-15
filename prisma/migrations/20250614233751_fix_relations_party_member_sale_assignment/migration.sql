-- CreateTable
CREATE TABLE "PartyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "lsCustomerId" TEXT,
    "role" TEXT NOT NULL,
    "measurements" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Selected',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" TEXT NOT NULL,
    "associateId" INTEGER NOT NULL,
    "commissionRate" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SaleAssignment_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alteration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "notes" TEXT,
    "timeSpent" INTEGER,
    "scheduledDateTime" DATETIME,
    "tailorId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "externalId" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "memberId" INTEGER,
    "lsLineItemId" TEXT,
    "assignedTailorId" INTEGER,
    CONSTRAINT "Alteration_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Alteration_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alteration_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PartyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Alteration_assignedTailorId_fkey" FOREIGN KEY ("assignedTailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Alteration" ("createdAt", "externalId", "id", "notes", "partyId", "scheduledDateTime", "status", "syncedAt", "tailorId", "timeSpent", "updatedAt") SELECT "createdAt", "externalId", "id", "notes", "partyId", "scheduledDateTime", "status", "syncedAt", "tailorId", "timeSpent", "updatedAt" FROM "Alteration";
DROP TABLE "Alteration";
ALTER TABLE "new_Alteration" RENAME TO "Alteration";
CREATE TABLE "new_Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "duration" INTEGER,
    "tailorId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "externalId" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "memberId" INTEGER,
    "endDatetime" DATETIME,
    "type" TEXT,
    "notes" TEXT,
    "lsEventId" TEXT,
    CONSTRAINT "Appointment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PartyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("createdAt", "dateTime", "duration", "externalId", "id", "partyId", "status", "syncedAt", "tailorId", "updatedAt") SELECT "createdAt", "dateTime", "duration", "externalId", "id", "partyId", "status", "syncedAt", "tailorId", "updatedAt" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "customerId" INTEGER NOT NULL,
    "externalId" TEXT,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "syncedToLs" BOOLEAN NOT NULL DEFAULT false,
    "lsPartyId" TEXT,
    CONSTRAINT "Party_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Party" ("createdAt", "customerId", "eventDate", "externalId", "id", "name", "syncedAt", "updatedAt") SELECT "createdAt", "customerId", "eventDate", "externalId", "id", "name", "syncedAt", "updatedAt" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
