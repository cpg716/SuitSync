/*
  Warnings:

  - You are about to alter the column `measurements` on the `PartyMember` table. The data in that column could be lost. The data in that column will be cast from `String` to `Json`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PartyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "lsCustomerId" TEXT,
    "role" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Selected',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "measurements" JSONB,
    CONSTRAINT "PartyMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PartyMember" ("createdAt", "id", "lsCustomerId", "measurements", "notes", "partyId", "role", "status", "updatedAt") SELECT "createdAt", "id", "lsCustomerId", "measurements", "notes", "partyId", "role", "status", "updatedAt" FROM "PartyMember";
DROP TABLE "PartyMember";
ALTER TABLE "new_PartyMember" RENAME TO "PartyMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
