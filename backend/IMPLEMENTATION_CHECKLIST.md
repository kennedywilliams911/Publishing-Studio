# Backend Implementation Checklist

Quick reference for completing the backend implementation.

## Phase 1: Database & Core Setup ✅

- [x] Update Prisma schema with new models
- [x] Create database migration
- [x] Add helper functions (helpers.ts)
- [x] Create all route files

## Phase 2: Route Implementation ✅

- [x] Search & Tags (`src/routes/search.ts`)
- [x] View Tracking & Analytics (`src/routes/analytics.ts`)
- [x] Newsletter System (`src/routes/newsletter.ts`)
- [x] Comments & Moderation (`src/routes/comments.ts`)
- [x] Article Series (`src/routes/series.ts`)
- [x] Version History (`src/routes/versions.ts`)
- [x] Translations & TTS (`src/routes/translations.ts`)

## Phase 3: Integration ✅

- [x] Update main index.ts with all routes
- [x] Update requireAuth middleware
- [x] Setup background jobs in index.ts
- [x] Create jobs.ts for scheduling

## Phase 4: To Complete 🔄

### Before Running

```bash
# Apply database migration
npm run db:migrate

# Build TypeScript
npm run build

# Start development server
npm run dev
```

### Integration Tasks

- [ ] **Newsletter:** Integrate email service (Sendgrid, Mailgun, etc.)
  - File: `src/routes/newsletter.ts` - TODO: Send confirmation email
  - File: `src/routes/newsletter.ts` - TODO: Send newsletter emails

- [ ] **Comments:** Implement admin email notifications
  - File: `src/routes/comments.ts` - TODO: Send email notification to admin

- [ ] **Translation:** Integrate translation API (Google Translate, DeepL)
  - File: `src/routes/translations.ts` - `translateText()` function
  - Update: API key in `.env` file

- [ ] **Text-to-Speech:** Integrate TTS API (Google Cloud, Azure, AWS)
  - File: `src/routes/translations.ts` - `generateSpeech()` function
  - Update: API key in `.env` file

- [ ] **Audio Upload:** Configure file storage and CORS
  - File: `src/routes/admin-upload.ts` - Add audio upload handler
  - Configure: Cloudinary, AWS S3, or Vercel Blob

- [ ] **Version Tracking:** Integrate with article update endpoints
  - File: `src/routes/admin-articles.ts` - Call `saveArticleVersion()` on update
  - Import: `import { saveArticleVersion } from "../routes/versions"`

- [ ] **Scheduled Publishing:** Test background job
  - File: `src/lib/jobs.ts` - Verify `publishScheduledArticles()` runs

- [ ] **Rate Limiting:** Consider upgrading to Redis for production
  - Current: In-memory (fine for development)
  - Production: Use Redis or external rate limiter

## Environment Setup

### Required .env Variables

```env
# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/pastor_articles_db

# Optional - Add when implementing features
SENDGRID_API_KEY=
MAILGUN_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
DEEPL_API_KEY=
GOOGLE_CLOUD_TTS_KEY=
AWS_S3_BUCKET=
AWS_S3_REGION=
CLOUDINARY_CLOUD_NAME=
FRONTEND_ORIGIN=http://localhost:3000
```

## Testing Checklist

### Database

- [ ] Migration runs without errors
- [ ] All new tables created
- [ ] Indexes created successfully
- [ ] Foreign keys set up correctly

### Routes

- [ ] Search endpoint returns results
- [ ] View tracking endpoint works
- [ ] Newsletter subscribe/unsubscribe works
- [ ] Comments can be submitted
- [ ] Series can be created
- [ ] Version history saves
- [ ] Translations endpoint responds

### Background Jobs

- [ ] Jobs initialized on startup
- [ ] No errors in console
- [ ] Scheduled articles publish correctly
- [ ] View counts update periodically

### Integration

- [ ] Frontend can fetch articles
- [ ] Frontend can search
- [ ] Frontend can submit comments
- [ ] Frontend can subscribe to newsletter
- [ ] Admin can moderate comments
- [ ] Admin can view analytics

## Production Deployment

### Before Going Live

- [ ] All environment variables set
- [ ] Database backed up
- [ ] SSL/TLS configured
- [ ] CORS headers correct
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Monitoring set up
- [ ] Load testing passed

### Services to Configure

- [ ] Email service (for newsletter & notifications)
- [ ] Translation API (for multi-language)
- [ ] Text-to-Speech API (for audio)
- [ ] File storage (for audio files)
- [ ] Error tracking (Sentry, etc.)

## Quick Reference

### Common Commands

```bash
# Database
npm run db:migrate       # Apply migration
npm run db:migrate:deploy  # Deploy to production
npm run db:studio        # Open Prisma Studio
npm run db:seed         # Seed database

# Development
npm run dev             # Start dev server
npm run build           # Build TypeScript
npm start               # Run built code

# Prisma
npx prisma generate    # Regenerate types
npx prisma db push     # Push schema to DB
```

### File Locations

- Migrations: `prisma/migrations/`
- Routes: `src/routes/`
- Helpers: `src/lib/helpers.ts`
- Jobs: `src/lib/jobs.ts`
- Middleware: `src/middleware/`
- Schema: `prisma/schema.prisma`

### API Endpoints Summary

**Search & Tags:**

- `GET /api/public/search/articles`
- `GET /api/public/search/tags`
- `POST /api/admin/articles/:id/tags`

**Analytics:**

- `POST /api/public/analytics/:id/views`
- `GET /api/public/analytics/:id/stats`
- `GET /api/admin/articles/analytics`

**Newsletter:**

- `POST /api/newsletter/subscribe`
- `POST /api/newsletter/unsubscribe`
- `GET /api/newsletter/subscribers`
- `POST /api/newsletter/send`

**Comments:**

- `POST /api/articles/:id/comments`
- `GET /api/articles/:id/comments`
- `GET /api/admin/comments`
- `PATCH /api/admin/comments/:id`

**Series:**

- `POST /api/admin/articles/:id/series`
- `GET /api/public/series/:slug`
- `GET /api/admin/series`

**Versions:**

- `GET /api/admin/articles/:id/versions`
- `POST /api/admin/articles/:id/versions/:versionId/restore`

**Translations:**

- `POST /api/translate/text`
- `POST /api/translate/speak`
- `GET /api/translate/articles/:id/translations`
- `POST /api/translate/articles/:id/translations/generate`

## Status: READY FOR TESTING ✅

All files created and configured. Ready to run migrations and test!
