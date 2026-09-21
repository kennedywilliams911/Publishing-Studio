ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "enableContributions" BOOLEAN NOT NULL DEFAULT false;
