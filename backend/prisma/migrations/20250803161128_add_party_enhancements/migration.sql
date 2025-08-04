-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "salesPersonId" INTEGER,
ADD COLUMN     "suitColor" TEXT,
ADD COLUMN     "suitStyle" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Party_salesPersonId_idx" ON "Party"("salesPersonId");

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
