-- CreateTable
CREATE TABLE "Party" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "externalId" TEXT,
    "syncedToLightspeed" BOOLEAN NOT NULL DEFAULT false,
    "customerId" INTEGER NOT NULL,
    CONSTRAINT "Party_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "externalCustomerId" TEXT
);

-- CreateTable
CREATE TABLE "Alteration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "notes" TEXT,
    "timeSpentMinutes" INTEGER,
    "externalLineItemId" TEXT,
    CONSTRAINT "Alteration_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "partyId" INTEGER NOT NULL,
    "dateTime" DATETIME NOT NULL,
    "durationMinutes" INTEGER,
    CONSTRAINT "Appointment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Party_externalId_key" ON "Party"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_externalCustomerId_key" ON "Customer"("externalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Alteration_externalLineItemId_key" ON "Alteration"("externalLineItemId");
