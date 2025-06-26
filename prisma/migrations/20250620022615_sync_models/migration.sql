/*
  Warnings:

  - You are about to drop the column `assignedTailorId` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `part` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledTime` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `taskTypeId` on the `AlterationJobPart` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `direction` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `partyId` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `keys` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `proficiency` on the `TailorAbility` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tailorId,taskTypeId]` on the table `TailorAbility` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tailorId,dayOfWeek]` on the table `TailorSchedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `partName` to the `AlterationJobPart` table without a default value. This is not possible if the table is not empty.
  - Added the required column `body` to the `CommunicationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient` to the `CommunicationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `auth` to the `PushSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `p256dh` to the `PushSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `TailorSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AlterationJobPart" DROP CONSTRAINT "AlterationJobPart_assignedTailorId_fkey";

-- DropForeignKey
ALTER TABLE "AlterationJobPart" DROP CONSTRAINT "AlterationJobPart_taskTypeId_fkey";

-- AlterTable
ALTER TABLE "AlterationJobPart" DROP COLUMN "assignedTailorId",
DROP COLUMN "duration",
DROP COLUMN "notes",
DROP COLUMN "part",
DROP COLUMN "scheduledTime",
DROP COLUMN "taskTypeId",
ADD COLUMN     "abilityId" INTEGER,
ADD COLUMN     "assignedTo" INTEGER,
ADD COLUMN     "partName" TEXT NOT NULL,
ADD COLUMN     "timeSpent" INTEGER;

-- AlterTable
ALTER TABLE "CommunicationLog" DROP COLUMN "content",
DROP COLUMN "createdAt",
DROP COLUMN "customerId",
DROP COLUMN "direction",
DROP COLUMN "partyId",
DROP COLUMN "updatedAt",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "recipient" TEXT NOT NULL,
ADD COLUMN     "subject" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "lightspeedVersion" BIGINT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PushSubscription" DROP COLUMN "keys",
DROP COLUMN "updatedAt",
ADD COLUMN     "auth" TEXT NOT NULL,
ADD COLUMN     "p256dh" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "TailorAbility" DROP COLUMN "proficiency",
ADD COLUMN     "efficiencyFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "experience" TEXT;

-- AlterTable
ALTER TABLE "TailorSchedule" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isOff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "lightspeedId" TEXT NOT NULL,
    "lightspeedVersion" BIGINT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "brandName" TEXT,
    "supplierName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" SERIAL NOT NULL,
    "lightspeedId" TEXT NOT NULL,
    "lightspeedVersion" BIGINT,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLineItem" (
    "id" SERIAL NOT NULL,
    "lightspeedId" TEXT NOT NULL,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "entity" TEXT NOT NULL,
    "lastVersion" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("entity")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_lightspeedId_key" ON "Product"("lightspeedId");

-- CreateIndex
CREATE INDEX "Product_lightspeedId_idx" ON "Product"("lightspeedId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_lightspeedId_key" ON "Sale"("lightspeedId");

-- CreateIndex
CREATE INDEX "Sale_lightspeedId_idx" ON "Sale"("lightspeedId");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleLineItem_lightspeedId_key" ON "SaleLineItem"("lightspeedId");

-- CreateIndex
CREATE INDEX "SaleLineItem_saleId_idx" ON "SaleLineItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleLineItem_productId_idx" ON "SaleLineItem"("productId");

-- CreateIndex
CREATE INDEX "AlterationJobPart_jobId_idx" ON "AlterationJobPart"("jobId");

-- CreateIndex
CREATE INDEX "AlterationJobPart_assignedTo_idx" ON "AlterationJobPart"("assignedTo");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TailorAbility_tailorId_taskTypeId_key" ON "TailorAbility"("tailorId", "taskTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "TailorSchedule_tailorId_dayOfWeek_key" ON "TailorSchedule"("tailorId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlterationJobPart" ADD CONSTRAINT "AlterationJobPart_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "TailorAbility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItem" ADD CONSTRAINT "SaleLineItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLineItem" ADD CONSTRAINT "SaleLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
