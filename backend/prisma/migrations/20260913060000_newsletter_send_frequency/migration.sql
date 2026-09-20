ALTER TABLE "newsletter_sends"
ADD COLUMN IF NOT EXISTS "frequency" TEXT NOT NULL DEFAULT 'immediate';
