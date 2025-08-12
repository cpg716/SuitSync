-- Add online booking settings to Settings table
ALTER TABLE "Settings"
  ADD COLUMN IF NOT EXISTS "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onlineBookingAllowedTypes" TEXT,
  ADD COLUMN IF NOT EXISTS "onlineBookingAdvanceDays" INTEGER,
  ADD COLUMN IF NOT EXISTS "onlineBookingIframeAllowedOrigins" TEXT,
  ADD COLUMN IF NOT EXISTS "onlineBookingTimezone" TEXT,
  ADD COLUMN IF NOT EXISTS "onlineBookingMinNoticeMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "onlineBookingMaxPerDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "onlineBookingRequirePhone" BOOLEAN NOT NULL DEFAULT false;


