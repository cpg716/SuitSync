-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN "lightspeedUserId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "UserSession_lightspeedUserId_idx" ON "UserSession"("lightspeedUserId");

-- Remove the default after adding the column
ALTER TABLE "UserSession" ALTER COLUMN "lightspeedUserId" DROP DEFAULT; 