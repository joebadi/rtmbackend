-- Live Dates scheduler: auto-start flag + "starting soon" reminder dedupe guard
ALTER TABLE "live_events" ADD COLUMN IF NOT EXISTS "autoStart" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "live_events" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
