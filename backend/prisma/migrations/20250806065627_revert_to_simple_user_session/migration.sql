-- Revert UserSession table to simple schema
-- Drop all the complex fields that were added

-- Drop indexes first
DROP INDEX IF EXISTS "UserSession_lightspeedUserId_idx";
DROP INDEX IF EXISTS "UserSession_isActive_idx";
DROP INDEX IF EXISTS "UserSession_lastActiveAt_idx";

-- Drop unique constraint
DROP INDEX IF EXISTS "UserSession_lightspeedUserId_key";

-- Drop foreign key constraint
ALTER TABLE "UserSession" DROP CONSTRAINT IF EXISTS "UserSession_userId_fkey";

-- Drop the complex columns
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "deviceInfo";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "email";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "isActive";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "lastActiveAt";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "lightspeedEmployeeId";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "lightspeedUserId";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "name";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "photoUrl";
ALTER TABLE "UserSession" DROP COLUMN IF EXISTS "role";

-- Add back the simple fields
ALTER TABLE "UserSession" ADD COLUMN "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make the required fields NOT NULL again
ALTER TABLE "UserSession" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "browserSessionId" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "lsAccessToken" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "lsRefreshToken" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "lsDomainPrefix" SET NOT NULL;
ALTER TABLE "UserSession" ALTER COLUMN "expiresAt" SET NOT NULL;

-- Recreate the indexes
CREATE INDEX "UserSession_lastActive_idx" ON "UserSession"("lastActive");

-- Recreate the foreign key constraint
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; 