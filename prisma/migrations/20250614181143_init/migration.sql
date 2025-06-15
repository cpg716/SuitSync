-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "syncedToLightspeed" BOOLEAN NOT NULL DEFAULT false,
    "customerId" INTEGER NOT NULL
);
INSERT INTO "new_Party" ("customerId", "eventDate", "id", "name") SELECT "customerId", "eventDate", "id", "name" FROM "Party";
DROP TABLE "Party";
ALTER TABLE "new_Party" RENAME TO "Party";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
