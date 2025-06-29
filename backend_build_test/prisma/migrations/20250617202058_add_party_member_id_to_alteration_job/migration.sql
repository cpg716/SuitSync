-- AlterTable
ALTER TABLE "AlterationJob" ADD COLUMN     "partyMemberId" INTEGER;

-- CreateIndex
CREATE INDEX "AlterationJob_partyMemberId_idx" ON "AlterationJob"("partyMemberId");

-- AddForeignKey
ALTER TABLE "AlterationJob" ADD CONSTRAINT "AlterationJob_partyMemberId_fkey" FOREIGN KEY ("partyMemberId") REFERENCES "PartyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
