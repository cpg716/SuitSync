-- Add lastMinute flag to AlterationJob
ALTER TABLE "AlterationJob" ADD COLUMN "lastMinute" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "AlterationJob_lastMinute_idx" ON "AlterationJob"("lastMinute");


