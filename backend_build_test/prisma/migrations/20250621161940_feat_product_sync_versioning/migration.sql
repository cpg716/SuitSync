-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lightspeedVersion" BIGINT,
ALTER COLUMN "syncedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ALTER COLUMN "syncedAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Product_lightspeedId_idx" ON "Product"("lightspeedId");
