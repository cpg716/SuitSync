/*
  Warnings:

  - You are about to drop the column `measurements` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lightspeedId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Customer_email_key";

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "measurements",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "createdBy" INTEGER,
ADD COLUMN     "lightspeedId" TEXT;

-- CreateTable
CREATE TABLE "Measurements" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "chest" TEXT,
    "waistJacket" TEXT,
    "hips" TEXT,
    "shoulderWidth" TEXT,
    "sleeveLength" TEXT,
    "jacketLength" TEXT,
    "overarm" TEXT,
    "neck" TEXT,
    "trouserWaist" TEXT,
    "inseam" TEXT,
    "outseam" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "shirtCollar" TEXT,
    "shirtSleeve" TEXT,
    "fitPreference" TEXT,
    "outOfTown" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Measurements_customerId_key" ON "Measurements"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_lightspeedId_key" ON "Customer"("lightspeedId");

-- CreateIndex
CREATE INDEX "Customer_lightspeedId_idx" ON "Customer"("lightspeedId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurements" ADD CONSTRAINT "Measurements_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
