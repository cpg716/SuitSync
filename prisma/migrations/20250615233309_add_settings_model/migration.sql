-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "reminderIntervals" TEXT NOT NULL DEFAULT '24,4',
    "emailSubject" TEXT NOT NULL DEFAULT 'Reminder: Your appointment at {shopName}',
    "emailBody" TEXT NOT NULL DEFAULT 'Hi {customerName},
This is a reminder for your appointment with {partyName} on {dateTime}.',
    "smsBody" TEXT NOT NULL DEFAULT 'Reminder: {partyName} appointment on {dateTime} at {shopName}.',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
