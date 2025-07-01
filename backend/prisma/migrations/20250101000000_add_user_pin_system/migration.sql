-- Add PIN-based user switching support
ALTER TABLE "User" ADD COLUMN "pinHash" TEXT;
ALTER TABLE "User" ADD COLUMN "pinSetAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "pinAttempts" INTEGER DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "pinLockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastPinUse" TIMESTAMP(3);

-- Add index for PIN security
CREATE INDEX "User_pinHash_idx" ON "User"("pinHash");
CREATE INDEX "User_pinLockedUntil_idx" ON "User"("pinLockedUntil");
