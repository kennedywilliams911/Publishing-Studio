-- Assign legacy subscribers to the original publisher before making ownership required.
UPDATE "newsletter_subscribers"
SET "userId" = (
  SELECT "id" FROM "users" ORDER BY "createdAt" ASC LIMIT 1
)
WHERE "userId" IS NULL;

DROP INDEX "newsletter_subscribers_email_key";

ALTER TABLE "newsletter_subscribers"
ALTER COLUMN "userId" SET NOT NULL;

CREATE UNIQUE INDEX "newsletter_subscribers_userId_email_key"
ON "newsletter_subscribers"("userId", "email");