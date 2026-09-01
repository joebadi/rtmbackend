ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isTest" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "users_isTest_idx" ON "users" ("isTest");
