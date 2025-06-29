/*
  Warnings:

  - You are about to drop the column `lightspeedSaleId` on the `AlterationJob` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[lightspeedServiceOrderId]` on the table `AlterationJob` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AlterationJob" DROP COLUMN "lightspeedSaleId",
ADD COLUMN     "lightspeedServiceOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AlterationJob_lightspeedServiceOrderId_key" ON "AlterationJob"("lightspeedServiceOrderId");
