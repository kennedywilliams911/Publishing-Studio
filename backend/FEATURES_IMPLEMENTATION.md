# Backend Features Implementation Guide

This document describes all the new backend features implemented for the Pastor Articles platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Features Implemented](#features-implemented)
4. [API Endpoints](#api-endpoints)
5. [Background Jobs](#background-jobs)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- `.env` file with `DATABASE_URL`

### Setup

```bash
# Install dependencies
npm install

# Run database migration
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:4000`

---

## Database Setup

### Create Migration

The database migration is located at:

```
prisma/migrations/20260901000000_add_features/migration.sql
```

### Apply Migration

```bash
# Using Prisma
npm run db:migrate

# Or manually with psql
psql -U postgres -d pastor_articles_db -f prisma/migrations/20260901000000_add_features/migration.sql
```

### Verify Tables

```bash
npm run db:studio

# Or query directly
psql -U postgres -d pastor_articles_db
\dt  # List all tables
```

---

## Features Implemented

### 1. Search & Tags (Routes: `/api/public/search`)

- Full-text search across articles
- Filter by tags
- Pagination support
- Returns article metadata with tags and series info

**Database Tables:**

- `tags` - Tag definitions
- `article_tags` - Junction table for articles and tags

**Key Files:**

- `src/routes/search.ts` - Search endpoints
- `src/lib/helpers.ts` - generateSlug() helper

**Example Usage:**

```bash
# Search articles
curl "http://localhost:4000/api/public/search/articles?q=faith&tag=devotional&limit=12&offset=0"

# Get all tags
curl "http://localhost:4000/api/public/search/tags"

# Add tags to article (admin only)
curl -X POST "http://localhost:4000/api/admin/articles/123/tags" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"tags": [{"name": "Faith", "slug": "faith"}]}'
```

---

### 2. View Tracking & Analytics (Routes: `/api/public/analytics`)

- Fire-and-forget view tracking
- IP hashing for privacy
- Analytics dashboard
- View counts per article

**Database Tables:**

- `article_views` - Individual view records
- Added `viewCount` column to `articles` table

**Key Files:**

- `src/routes/analytics.ts` - Analytics endpoints
- `src/lib/helpers.ts` - hashIP() helper
- `src/lib/jobs.ts` - batchUpdateViewCounts() job

**Example Usage:**

```bash
# Track article view (fire-and-forget)
curl -X POST "http://localhost:4000/api/public/analytics/123/views"

# Get article stats
curl "http://localhost:4000/api/public/analytics/123/stats"

# Get admin analytics (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/public/analytics/analytics?period=month"
```

---

### 3. Newsletter System (Routes: `/api/newsletter`)

- Email subscription management
- Unsubscribe tokens
- Subscriber list management
- Newsletter sending (background job)

**Database Tables:**

- `newsletter_subscribers` - Subscriber list

**Key Files:**

- `src/routes/newsletter.ts` - Newsletter endpoints
- `src/lib/helpers.ts` - isValidEmail(), generateToken() helpers
- `src/lib/jobs.ts` - sendDailyNewsletter() job

**Example Usage:**

```bash
# Subscribe to newsletter
curl -X POST "http://localhost:4000/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Unsubscribe from newsletter
curl -X POST "http://localhost:4000/api/newsletter/unsubscribe" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "token": "unsubscribe_token"}'

# Get subscribers list (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/newsletter/subscribers"

# Send newsletter (admin only)
curl -X POST "http://localhost:4000/api/newsletter/send" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"subject": "New Articles", "articleIds": ["id1", "id2"]}'
```

---

### 4. Comments & Moderation (Routes: `/api/articles`, `/api/admin/comments`)

- Public comment submission
- Admin moderation
- Comment approval workflow
- Spam protection with rate limiting

**Database Tables:**

- `comments` - Comment records with approval status

**Key Files:**

- `src/routes/comments.ts` - Comments endpoints
- `src/lib/helpers.ts` - sanitizeContent(), checkRateLimit() helpers

**Example Usage:**

```bash
# Submit comment (public)
curl -X POST "http://localhost:4000/api/articles/123/comments" \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com", "content": "Great article!"}'

# Get approved comments
curl "http://localhost:4000/api/articles/123/comments"

# Get all comments for article (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/articles/123/comments"

# Approve comment (admin only)
curl -X PATCH "http://localhost:4000/api/admin/comments/123" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"approved": true}'
```

---

### 5. Article Series (Routes: `/api/admin/series`, `/api/public/series`)

- Group articles into series
- Series navigation
- Position tracking
- Author-specific series

**Database Tables:**

- `series` - Series metadata
- Added `seriesId` and `seriesPosition` columns to `articles` table

**Key Files:**

- `src/routes/series.ts` - Series endpoints

**Example Usage:**

```bash
# Create/add article to series (admin only)
curl -X POST "http://localhost:4000/api/admin/articles/123/series" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"title": "7-Part Series on Faith", "position": 1}'

# Get series articles
curl "http://localhost:4000/api/public/series/faith-series"

# List series (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/admin/series"
```

---

### 6. Version History (Routes: `/api/admin/articles/:id/versions`)

- Auto-save on every article update
- Restore to previous versions
- Audit trail with creator info
- Limit to 20 versions per article

**Database Tables:**

- `article_versions` - Version records

**Key Files:**

- `src/routes/versions.ts` - Version endpoints
- Export: `saveArticleVersion()` - Call this on article update

**Example Usage:**

```bash
# Get version history (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/admin/articles/123/versions"

# Restore version (admin only)
curl -X POST "http://localhost:4000/api/admin/articles/123/versions/version-id/restore" \
  -H "Authorization: Bearer token"
```

**Integration in admin-articles.ts:**

```typescript
import { saveArticleVersion } from "./versions";

// When updating article
await saveArticleVersion(articleId, newTitle, newContent, newExcerpt, userId);
```

---

### 7. Audio Upload (Routes: `/api/admin/upload/audio`)

- Audio file upload for articles
- File type validation (mp3, wav, ogg)
- Max file size enforcement (100MB)
- Returns CDN URL

**Database:**

- Added `audioUrl` column to `articles` table

**Key Files:**

- `src/routes/admin-upload.ts` - Update to handle audio
- Use existing upload infrastructure

**Example Usage:**

```bash
# Upload audio (admin only)
curl -X POST "http://localhost:4000/api/admin/upload/audio" \
  -H "Authorization: Bearer token" \
  -F "file=@article.mp3" \
  -F "articleId=123"

# Update article with audio
curl -X PATCH "http://localhost:4000/api/admin/articles/123" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://cdn.example.com/audio.mp3"}'
```

---

### 8. Scheduled Publishing (Routes: `/api/admin/articles/:id`)

- Schedule article publish time
- Automatic publishing via background job
- Timezone-aware scheduling

**Database:**

- Added `scheduledPublishAt` column to `articles` table

**Key Files:**

- `src/lib/jobs.ts` - publishScheduledArticles() job

**Example Usage:**

```bash
# Schedule article (admin only)
curl -X PATCH "http://localhost:4000/api/admin/articles/123" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"scheduledPublishAt": "2026-09-15T08:00:00Z"}'
```

---

### 9. Multi-Language Translation (Routes: `/api/translate`, `/api/admin/articles/:id/translations`)

- Translate articles to 8 languages
- Text-to-speech audio generation
- Cache translations in database
- Admin language preferences

**Supported Languages:**

- English (en), Spanish (es), French (fr), Italian (it)
- German (de), Igbo (ig), Hausa (ha), Yoruba (yo)

**Database Tables:**

- `article_translations` - Cached translations
- Added `preferredLanguage` and `enableTranslation` columns to `users` table

**Key Files:**

- `src/routes/translations.ts` - Translation endpoints
- API integration needed for actual translation service

**Example Usage:**

```bash
# Translate text
curl -X POST "http://localhost:4000/api/translate/text" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "targetLanguage": "es"}'

# Generate speech
curl -X POST "http://localhost:4000/api/translate/speak" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "language": "es"}'

# Get article translations (admin only)
curl -H "Authorization: Bearer token" \
  "http://localhost:4000/api/translate/articles/123/translations"

# Generate translation (admin only)
curl -X POST "http://localhost:4000/api/translate/articles/123/translations/generate" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"language": "fr"}'
```

---

## Background Jobs

Background jobs run automatically and handle long-running tasks:

### 1. Publish Scheduled Articles

- **Runs:** Every 1 minute
- **Task:** Checks for articles with `scheduledPublishAt <= now()` and publishes them
- **File:** `src/lib/jobs.ts` - `publishScheduledArticles()`

### 2. Update View Counts

- **Runs:** Every 5 minutes
- **Task:** Batches article view count updates
- **File:** `src/lib/jobs.ts` - `batchUpdateViewCounts()`

### 3. Send Daily Newsletter

- **Runs:** Every day at 8:00 AM UTC
- **Task:** Sends newsletter with today's articles to verified subscribers
- **File:** `src/lib/jobs.ts` - `sendDailyNewsletter()`

### 4. Cleanup Old Views

- **Runs:** Every Sunday at midnight UTC
- **Task:** Deletes view records older than 90 days
- **File:** `src/lib/jobs.ts` - `cleanupOldViews()`

### Initialization

Jobs are automatically set up when the server starts. See `src/lib/jobs.ts` for configuration.

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pastor_articles_db

# Email (when implementing newsletter)
SENDGRID_API_KEY=your_api_key
# or
MAILGUN_API_KEY=your_api_key

# Translation Service (optional)
GOOGLE_TRANSLATE_API_KEY=your_api_key
# or
DEEPL_API_KEY=your_api_key

# Text-to-Speech (optional)
GOOGLE_CLOUD_TTS_KEY=your_api_key

# Frontend
FRONTEND_ORIGIN=http://localhost:3000
```

---

## Testing

### Manual Testing

```bash
# Health check
curl http://localhost:4000/health

# Search articles
curl "http://localhost:4000/api/public/search/articles?q=test"

# Create tag
curl -X POST "http://localhost:4000/api/admin/articles/123/tags" \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"tags": [{"name": "Test", "slug": "test"}]}'
```

### Database Queries

```sql
-- Check tags
SELECT * FROM tags;

-- Check article views
SELECT articleId, COUNT(*) as views FROM article_views GROUP BY articleId;

-- Check pending comments
SELECT * FROM comments WHERE approved = false;

-- Check scheduled articles
SELECT * FROM articles WHERE "scheduledPublishAt" > NOW() AND status = 'DRAFT';

-- Check series
SELECT * FROM series;

-- Check translations
SELECT * FROM article_translations;
```

---

## Troubleshooting

### Migration Issues

```bash
# Reset database (careful!)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# View database schema
npm run db:studio
```

### Route Not Found

Ensure the route is registered in `src/index.ts`. Check:

- Import statement
- `app.use()` call
- URL prefix matches API specification

### Database Connection

```bash
# Test connection
npm run db:studio

# Check URL format
# postgresql://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]
```

### Type Errors

```bash
# Regenerate Prisma types
npx prisma generate

# Rebuild TypeScript
npm run build
```

---

## Files Overview

### New Files Created

```
src/
├── routes/
│   ├── search.ts           # Tags & search endpoints
│   ├── analytics.ts        # View tracking & analytics
│   ├── newsletter.ts       # Newsletter subscription
│   ├── comments.ts         # Comments moderation
│   ├── series.ts           # Series management
│   ├── versions.ts         # Version history
│   └── translations.ts     # Translations & TTS
├── lib/
│   ├── helpers.ts          # Helper functions
│   └── jobs.ts             # Background jobs
prisma/
└── migrations/
    └── 20260901000000_add_features/
        └── migration.sql   # Database migration
```

### Modified Files

```
src/
├── index.ts                # Added route imports & setup
└── middleware/
    └── requireAuth.ts      # Added userId property
prisma/
└── schema.prisma           # Added new models
```

---

## Next Steps

1. **Setup Database:** Run migrations
2. **Configure Services:** Add API keys for email/translation/TTS
3. **Test Locally:** Use curl commands to test endpoints
4. **Integrate with Frontend:** Connect frontend components to APIs
5. **Deploy:** Push to production when ready

---

## Support

For questions or issues:

1. Check the API specification in the implementation guide
2. Review example curl commands above
3. Check background job logs
4. Verify database tables and indexes exist
