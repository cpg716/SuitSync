/*
  Warnings:

  - You are about to drop the column `saleLineItemId` on the `AlterationJob` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AlterationJob" DROP COLUMN "saleLineItemId",
ADD COLUMN     "lightspeedSaleId" TEXT;
