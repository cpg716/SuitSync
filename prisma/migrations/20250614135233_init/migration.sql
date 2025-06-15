/*
  Warnings:

  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `externalLineItemId` on the `Alteration` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Party` table. All the data in the column will be lost.
  - You are about to drop the column `syncedToLightspeed` on the `Party` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Customer_externalCustomerId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Customer";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Alteration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "notes" TEXT,
    "timeSpentMinutes" INTEGER,
    CONSTRAINT "Alteration_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Alteration" ("id", "notes", "partyId", "timeSpentMinutes") SELECT "id", "notes", "partyId", "timeSpentMinutes" FROM "Alteration";
DROP TABLE "Alteration";
ALTER TABLE "new_Alteration" RENAME TO "Alteration";
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "customerId" INTEGER NOT NULL
);
INSERT INTO "new_Party" ("customerId", "eventDate", "id", "name") SELECT "customerId", "eventDate", "id", "name" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
