/*
  Warnings:

  - You are about to drop the column `body` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `CommunicationLog` table. All the data in the column will be lost.
  - You are about to drop the column `brandName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `lightspeedVersion` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `supplierName` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PushSubscription` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `lightspeedVersion` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SaleLineItem` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SaleLineItem` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `SaleLineItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The primary key for the `SyncState` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `updatedAt` on the `SyncState` table. All the data in the column will be lost.
  - You are about to drop the column `efficiencyFactor` on the `TailorAbility` table. All the data in the column will be lost.
  - You are about to drop the column `experience` on the `TailorAbility` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TailorSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `dayOfWeek` on the `TailorSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isOff` on the `TailorSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TailorSchedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[entity]` on the table `SyncState` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `message` to the `CommunicationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `syncedAt` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `syncedAt` to the `Sale` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerId` on table `Sale` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `syncedAt` to the `SaleLineItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastSynced` to the `SyncState` table without a default value. This is not possible if the table is not empty.
  - Added the required column `skillLevel` to the `TailorAbility` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `startTime` on the `TailorSchedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `TailorSchedule` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_customerId_fkey";

-- DropIndex
DROP INDEX "Product_lightspeedId_idx";

-- DropIndex
DROP INDEX "Sale_customerId_idx";

-- DropIndex
DROP INDEX "Sale_lightspeedId_idx";

-- DropIndex
DROP INDEX "SaleLineItem_productId_idx";

-- DropIndex
DROP INDEX "SaleLineItem_saleId_idx";

-- DropIndex
DROP INDEX "TailorSchedule_tailorId_dayOfWeek_key";

-- AlterTable
ALTER TABLE "CommunicationLog" DROP COLUMN "body",
DROP COLUMN "error",
DROP COLUMN "subject",
ADD COLUMN     "message" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "brandName",
DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "lightspeedVersion",
DROP COLUMN "supplierName",
DROP COLUMN "updatedAt",
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "PushSubscription" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "createdAt",
DROP COLUMN "lightspeedVersion",
DROP COLUMN "updatedAt",
ADD COLUMN     "syncedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "customerId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SaleLineItem" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "syncedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "SyncState" DROP CONSTRAINT "SyncState_pkey",
DROP COLUMN "updatedAt",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "lastSynced" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "TailorAbility" DROP COLUMN "efficiencyFactor",
DROP COLUMN "experience",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "skillLevel" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TailorSchedule" DROP COLUMN "createdAt",
DROP COLUMN "dayOfWeek",
DROP COLUMN "isOff",
DROP COLUMN "updatedAt",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SyncState_entity_key" ON "SyncState"("entity");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
