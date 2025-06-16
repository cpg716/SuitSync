/*
  Warnings:

  - You are about to drop the `Alteration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Alteration";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "AlterationJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleLineItemId" INTEGER NOT NULL,
    "partyId" INTEGER,
    "customerId" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "timeSpentMinutes" INTEGER,
    "tailorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AlterationJob_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlterationJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AlterationJob_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
