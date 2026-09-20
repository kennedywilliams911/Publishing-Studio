ALTER TABLE "articles"
ADD COLUMN IF NOT EXISTS "proofreadingStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS "proofreadingNotes" TEXT,
ADD COLUMN IF NOT EXISTS "proofreadingUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "articles_proofreading_status_idx"
ON "articles" ("proofreadingStatus");
