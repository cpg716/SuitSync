/*
  Warnings:

  - You are about to drop the column `lsPartyId` on the `Party` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Customer_email_key";

-- AlterTable
ALTER TABLE "Party" DROP COLUMN "lsPartyId",
ADD COLUMN     "lightspeedGroupId" TEXT;
