CREATE TABLE "newsletter_sends" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_sends_articleId_authorId_key" ON "newsletter_sends"("articleId", "authorId");
CREATE INDEX "newsletter_sends_authorId_sentAt_idx" ON "newsletter_sends"("authorId", "sentAt");

ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
