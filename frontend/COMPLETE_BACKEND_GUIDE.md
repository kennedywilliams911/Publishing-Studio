# 🚀 Complete Backend Implementation Guide

## Pastor Articles Platform - 11 New Features

**Last Updated**: September 1, 2026  
**Frontend Status**: ✅ 100% Complete  
**Backend Status**: ⏳ Ready for Implementation  
**Estimated Effort**: 50-72 hours  
**Team**: Backend developers

---

## 📋 Table of Contents

1. [Quick Start Overview](#quick-start-overview)
2. [The 11 Features Explained](#the-11-features-explained)
3. [Project Setup & Timeline](#project-setup--timeline)
4. [Complete API Specifications](#complete-api-specifications)
5. [Database Schema](#database-schema)
6. [Implementation Priority](#implementation-priority)
7. [Testing & Deployment](#testing--deployment)
8. [Security Checklist](#security-checklist)
9. [Integration Checklist](#integration-checklist)

---

## Quick Start Overview

### What We're Building

A feature-rich article platform with:

- ✅ Full-text search + tag filtering
- ✅ View tracking & analytics
- ✅ Newsletter subscription system
- ✅ Comments with moderation
- ✅ Audio upload & playback
- ✅ Article series grouping
- ✅ Scheduled publishing
- ✅ Version history & restore
- ✅ RSS feed support
- ✅ Multi-language translation (7 languages)
- ✅ Text-to-speech audio generation

### Current State

**Frontend**: Complete and tested ✅

- 16 React components built
- Type-safe TypeScript interfaces
- Dark mode support
- Mobile responsive UI
- Ready to consume APIs

**Backend**: Not started yet

- Database tables need creation
- 20+ API endpoints need implementation
- 3-4 background jobs needed
- 4 external services need integration

### What You'll Do

1. **Week 1**: Database + Search + Views + Newsletter
2. **Week 2**: Comments + Series + Scheduling + Analytics
3. **Week 3**: Audio Upload + Version History
4. **Week 4**: Translation Services + Testing
5. **Week 5**: Performance Tuning + Deployment

---

## The 11 Features Explained

### 1️⃣ Search + Categories/Tags (8-10 hours)

**Why**: Users can't find content → 40-50% increase in content discovery

**What Frontend Has**:

- SearchBar modal component
- TagFilter component
- Automatic debouncing

**What You Need to Build**:

```
GET /api/public/articles?q=search&tag=slug&limit=12&offset=0
GET /api/public/tags
POST /api/admin/articles/:id/tags
```

**Database**:

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE article_tags (
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  tagId UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (articleId, tagId)
);
```

**Time Breakdown**:

- Full-text search setup: 3-4 hours
- API endpoints: 2-3 hours
- Database: 1 hour
- Testing: 1-2 hours

**Key Implementation Tips**:

- Use PostgreSQL `@@ to_tsquery()` for full-text search
- Index on title and content columns for performance
- Return tags in every article response
- Support pagination with limit/offset

---

### 2️⃣ View Tracking & Analytics (3-4 hours)

**Why**: Shows which articles resonate → Social proof motivates writers

**What Frontend Has**:

- ViewCounter badge showing view count
- Analytics dashboard page

**What You Need to Build**:

```
POST /api/public/articles/:id/views
GET /api/admin/articles/analytics?period=week|month|all
```

**Database**:

```sql
ALTER TABLE articles ADD COLUMN viewCount INT DEFAULT 0;

CREATE TABLE article_views (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  viewedAt TIMESTAMP DEFAULT NOW(),
  ipHash VARCHAR(255)
);
```

**Time Breakdown**:

- View tracking endpoint: 1 hour
- Analytics aggregation: 1-2 hours
- Dashboard: 1 hour

**Key Implementation Tips**:

- Hash IP addresses for GDPR compliance (use SHA256)
- Batch insert views every 100 records for performance
- Cache analytics results for 10 minutes
- Include top 10 trending articles in response
- Fire-and-forget endpoint (return 200 immediately)

---

### 3️⃣ Newsletter Subscription System (6-8 hours)

**Why**: Drives recurring traffic → Most effective engagement tool

**What Frontend Has**:

- Newsletter signup form with validation
- Newsletter management page (admin)
- Success notifications

**What You Need to Build**:

```
POST /api/newsletter/subscribe
POST /api/newsletter/unsubscribe
GET /api/admin/newsletter/subscribers
POST /api/admin/newsletter/send
```

**Database**:

```sql
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscribedAt TIMESTAMP DEFAULT NOW(),
  unsubscribedAt TIMESTAMP
);
```

**Services Required**:

- Email service (Sendgrid, Resend, Mailgun, or AWS SES)

**Time Breakdown**:

- Email service setup: 2-3 hours
- Subscribe endpoint: 1 hour
- Unsubscribe with tokens: 1 hour
- Send endpoint: 1 hour
- Testing: 1 hour

**Key Implementation Tips**:

- Queue email sends in background job
- Use secure tokens for unsubscribe links
- Add rate limiting (1 subscribe per email per 5 min)
- Send confirmation email on subscribe
- Implement daily newsletter sending at 8am UTC
- Track unsubscribe rate for analytics

---

### 4️⃣ Article Comments & Moderation (6-8 hours)

**Why**: Builds community → 2-3x engagement increase

**What Frontend Has**:

- Comment submission form
- Comments display with moderation UI
- Admin moderation dashboard

**What You Need to Build**:

```
POST /api/articles/:id/comments
GET /api/admin/comments
GET /api/admin/articles/:id/comments
PATCH /api/admin/comments/:id
```

**Database**:

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

**Time Breakdown**:

- Endpoints: 2-3 hours
- Moderation logic: 1-2 hours
- Email notifications: 1-2 hours
- Testing: 1 hour

**Key Implementation Tips**:

- Default comments to unapproved (manual moderation)
- Rate limit comment submission (1 per email per 1 min)
- Send email to admin on new comment
- Support bulk approve/reject for admin
- Soft-delete comments (don't physically remove)
- Only show approved comments to public

---

### 5️⃣ Audio Upload & Playback (4-5 hours)

**Why**: Accessibility feature → Podcast audience + driving/exercise

**What Frontend Has**:

- Audio player component with progress bar
- Audio upload field in editor
- Download link

**What You Need to Build**:

```
POST /api/upload/audio
PATCH /api/admin/articles/:id (with audioUrl)
```

**Database**:

```sql
ALTER TABLE articles ADD COLUMN audioUrl VARCHAR(500);
```

**Services Required**:

- File storage (AWS S3, Cloudinary, or Vercel Blob)

**Time Breakdown**:

- File storage setup: 1-2 hours
- Upload endpoint: 1 hour
- CORS configuration: 30 min
- Testing: 1-2 hours

**Key Implementation Tips**:

- Validate file type (mp3, wav, ogg only)
- Enforce file size limit (<100MB)
- Store files with unique names (include article ID)
- Return CDN URL in response (not local path)
- Configure CORS for audio playback in browser
- Support resumable uploads for large files

---

### 6️⃣ Article Series (4-5 hours)

**Why**: Keeps readers engaged → Increases session duration

**What Frontend Has**:

- Series navigation component
- Series form in article editor
- Series landing page

**What You Need to Build**:

```
POST /api/admin/articles/:id/series
GET /api/public/articles/series/:slug
```

**Database**:

```sql
CREATE TABLE series (
  id UUID PRIMARY KEY,
  authorId UUID REFERENCES authors(id),
  title VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

ALTER TABLE articles ADD COLUMN seriesId UUID REFERENCES series(id);
```

**Time Breakdown**:

- Series table & migration: 1 hour
- Endpoints: 1 hour
- Series navigation logic: 1-2 hours
- Testing: 1 hour

**Key Implementation Tips**:

- Support 1-to-many (series to articles)
- Return articles in position order
- Calculate series progress (e.g., "2 of 5")
- Support series count per author
- Allow moving articles between series
- Cascade delete articles when series deleted (optional)

---

### 7️⃣ Scheduled Publishing (4-5 hours)

**Why**: Better content planning → Writers can prepare in advance

**What Frontend Has**:

- Date/time picker for scheduling
- Schedule preview in admin
- Scheduled status display

**What You Need to Build**:

```
PATCH /api/admin/articles/:id (with scheduledPublishAt)
```

**Database**:

```sql
ALTER TABLE articles ADD COLUMN scheduledPublishAt TIMESTAMP;
```

**Background Job**:

```
Every 1 minute:
  - Find articles where scheduledPublishAt <= NOW()
  - Update status to "PUBLISHED"
  - Send email notification to author
```

**Time Breakdown**:

- Endpoint: 1 hour
- Background job setup: 1-2 hours
- Scheduler (cron/queue): 1-2 hours
- Testing: 1 hour

**Key Implementation Tips**:

- Use background job runner (Bull, RabbitMQ, etc.)
- Check every minute for articles to publish
- Send email notification on successful publish
- Support timezone-aware scheduling
- Allow updating scheduled time before publish
- Prevent manual publish if scheduledPublishAt is set

---

### 8️⃣ Article Version History (3-4 hours)

**Why**: Audit trail → Prevents accidental data loss + builds trust

**What Frontend Has**:

- Version history viewer
- Restore button
- Version preview

**What You Need to Build**:

```
GET /api/admin/articles/:id/versions
POST /api/admin/articles/:id/versions/:versionId/restore
```

**Database**:

```sql
CREATE TABLE article_versions (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedBy UUID REFERENCES authors(id)
);
```

**Time Breakdown**:

- Endpoints: 1 hour
- Auto-save logic: 1 hour
- Restore logic: 1 hour
- Testing: 1 hour

**Key Implementation Tips**:

- Auto-save on every PATCH (update) endpoint
- Limit to last 20 versions per article (delete oldest)
- Include updatedBy for audit trail
- Store full content (title + body) per version
- Support viewing diff between versions
- Create new version when restoring

---

### 9️⃣ RSS Feed Support (0 hours)

**Why**: Readers can subscribe via RSS readers

**Status**: ✅ **Already implemented on frontend!**

**What Frontend Does**:

- Route handler at `/feed.xml`
- Fetches from `/api/public/articles?limit=50`
- Generates valid RSS 2.0 XML

**What You Need**:

- Ensure `/api/public/articles?limit=50` returns: title, excerpt, content, publishedAt, featuredImage, authorName

**No backend implementation needed!** Just ensure your articles API returns the required fields.

---

### 🔟 Admin Dashboards (Already Included)

**Analytics Dashboard**: Shows top articles, view counts, trending
**Comments Dashboard**: Approve/reject pending comments, delete approved
**Newsletter Dashboard**: Subscriber list, export to CSV, delete subscriber

These are included in the other features!

---

### 1️⃣1️⃣ Multi-Language Translation + Text-to-Speech (10-12 hours)

**Why**: Reaches global audience → 60%+ engagement increase in non-English regions

**Supported Languages**:

- English (en)
- Spanish (es)
- French (fr)
- Italian (it)
- German (de)
- Igbo (ig)
- Hausa (ha)
- Yoruba (yo)

**What Frontend Has**:

- Language selector (7 buttons)
- Translate button
- "Listen Aloud" button for TTS
- Translation preview
- Admin language preference

**What You Need to Build**:

```
POST /api/translate/text
POST /api/translate/speak
GET /api/admin/articles/:id/translations
POST /api/admin/articles/:id/translations/generate
PATCH /api/admin/profile/language
```

**Database**:

```sql
CREATE TABLE article_translations (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  audioUrl VARCHAR(255),
  generatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(articleId, language)
);

ALTER TABLE authors ADD COLUMN preferredLanguage VARCHAR(5) DEFAULT 'en';
ALTER TABLE authors ADD COLUMN enableTranslation BOOLEAN DEFAULT FALSE;
```

**Services Required**:

- Translation service: Google Translate API or DeepL (DeepL is more accurate)
- Text-to-Speech: Google Cloud TTS, Azure Speech, or AWS Polly

**Time Breakdown**:

- Translation service setup: 1 hour
- TTS service setup: 1 hour
- Translate endpoint: 1.5 hours
- Speak endpoint: 1.5 hours
- Caching logic: 1 hour
- Testing: 1-2 hours

**Key Implementation Tips**:

- Cache translations for 30+ days to minimize API costs
- Cache audio files for 90 days on CDN
- Rate limit (1 translation per article per language per hour)
- Use language-specific voices for TTS
- Store full translations in DB (don't re-translate)
- Require admin auth for generating translations
- Auto-translate to top 3 languages on publish (optional)

---

## Project Setup & Timeline

### Prerequisites

**Technology Stack**:

- Backend: Node.js/Express, Python, Java, Go (choose your stack)
- Database: PostgreSQL 13+
- Queue: Bull, RabbitMQ, or similar
- Storage: AWS S3, Cloudinary, or Vercel Blob
- Services: Email, Translation, TTS

**Environment Setup**:

```bash
# Install PostgreSQL
# Create database: pastor_articles_db
# Create .env file with credentials

# Required env variables:
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=...
AWS_S3_BUCKET=...
GOOGLE_TRANSLATE_API_KEY=...
GOOGLE_CLOUD_TTS_KEY=...
```

### 5-Week Implementation Timeline

**Week 1: Foundation**

- Monday-Tuesday: Database setup + migrations
- Wednesday: Search + tags implementation
- Thursday: View tracking
- Friday: Newsletter basic setup

**Week 2: Community**

- Monday-Tuesday: Comments system
- Wednesday: Analytics dashboard
- Thursday: Series management
- Friday: Testing + bug fixes

**Week 3: Content**

- Monday: Audio upload endpoint
- Tuesday-Wednesday: Scheduling + background jobs
- Thursday: Version history
- Friday: Testing + optimization

**Week 4: Global**

- Monday-Wednesday: Translation service setup
- Thursday: Text-to-speech setup
- Friday: Full integration testing

**Week 5: Polish**

- Monday-Tuesday: Performance optimization
- Wednesday: Security hardening
- Thursday: Load testing
- Friday: Deployment + monitoring

---

## Complete API Specifications

### 1. Search & Tags Endpoints

#### GET `/api/public/articles`

Search and filter articles

**Query Parameters**:

- `q` (string) - Search query (optional)
- `tag` (string) - Filter by tag slug (optional)
- `limit` (number) - Items per page, default 12 (optional)
- `offset` (number) - Pagination offset, default 0 (optional)

**Example Request**:

```bash
curl "http://localhost:4000/api/public/articles?q=faith&tag=devotional&limit=12&offset=0"
```

**Success Response (200)**:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Finding Faith in Difficult Times",
      "slug": "finding-faith-difficult-times",
      "excerpt": "How to maintain faith when facing challenges...",
      "content": "Article content here...",
      "featuredImage": "https://cdn.example.com/image.jpg",
      "publishedAt": "2026-08-15T10:00:00Z",
      "tags": [
        { "id": "uuid", "name": "Faith", "slug": "faith" },
        { "id": "uuid", "name": "Devotional", "slug": "devotional" }
      ],
      "viewCount": 234,
      "seriesInfo": {
        "id": "uuid",
        "title": "Series Title",
        "slug": "series-slug",
        "position": 2,
        "totalInSeries": 5
      }
    }
  ],
  "total": 150
}
```

**Error Response (400)**:

```json
{
  "error": "Invalid query parameters"
}
```

---

#### GET `/api/public/tags`

List all available tags

**Example Request**:

```bash
curl "http://localhost:4000/api/public/tags"
```

**Success Response (200)**:

```json
{
  "tags": [
    { "id": "uuid", "name": "Faith", "slug": "faith" },
    { "id": "uuid", "name": "Devotional", "slug": "devotional" },
    { "id": "uuid", "name": "Prayer", "slug": "prayer" }
  ]
}
```

---

#### POST `/api/admin/articles/:id/tags`

Add/update tags for an article (admin only)

**Authentication**: Required (JWT in Cookie)

**Request Body**:

```json
{
  "tags": [
    { "id": "uuid", "name": "Faith", "slug": "faith" },
    { "id": "uuid", "name": "Devotional", "slug": "devotional" }
  ]
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "articleId": "550e8400-e29b-41d4-a716-446655440000",
    "tags": [{ "id": "uuid", "name": "Faith", "slug": "faith" }]
  }
}
```

---

### 2. View Tracking Endpoints

#### POST `/api/public/articles/:id/views`

Track article view (fire-and-forget)

**Request Body** (optional):

```json
{
  "ipAddress": "192.168.1.1"
}
```

**Success Response (200)**:

```json
{
  "success": true
}
```

**Important**: Return immediately (fire-and-forget). Don't wait for database insert.

---

#### GET `/api/public/articles/:id/stats`

Get article statistics

**Success Response (200)**:

```json
{
  "viewCount": 1234,
  "shares": 45,
  "comments": 12
}
```

---

#### GET `/api/admin/articles/analytics`

Admin analytics dashboard

**Query Parameters**:

- `period` (string) - week, month, or all

**Example Request**:

```bash
curl "http://localhost:4000/api/admin/articles/analytics?period=month"
```

**Success Response (200)**:

```json
{
  "period": "month",
  "totalViews": 45000,
  "averageViewsPerArticle": 450,
  "articles": [
    {
      "id": "uuid",
      "title": "Finding Faith in Difficult Times",
      "viewCount": 1234,
      "shares": 45,
      "comments": 12,
      "publishedAt": "2026-08-15T10:00:00Z"
    }
  ]
}
```

---

### 3. Newsletter Endpoints

#### POST `/api/newsletter/subscribe`

Subscribe to newsletter

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "message": "Subscribed successfully. Check your email for confirmation."
}
```

**Error Response (400)**:

```json
{
  "error": "Email already subscribed"
}
```

**Important**: Send confirmation email. Require email verification before marking as active.

---

#### POST `/api/newsletter/unsubscribe`

Unsubscribe from newsletter

**Request Body**:

```json
{
  "email": "user@example.com",
  "token": "secure_unsubscribe_token"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "message": "Unsubscribed successfully"
}
```

**Important**: Token should be generated at subscribe time and sent in unsubscribe links.

---

#### GET `/api/admin/newsletter/subscribers`

List newsletter subscribers (admin only)

**Authentication**: Required

**Query Parameters**:

- `status` (string) - active, unsubscribed, or all
- `limit` (number) - default 50
- `offset` (number) - default 0

**Success Response (200)**:

```json
{
  "subscribers": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "subscribedAt": "2026-08-01T10:00:00Z",
      "unsubscribedAt": null,
      "status": "active"
    }
  ],
  "active": 42,
  "unsubscribed": 3,
  "total": 45
}
```

---

#### POST `/api/admin/newsletter/send`

Send newsletter to subscribers (admin only)

**Authentication**: Required

**Request Body**:

```json
{
  "subject": "New Articles This Week",
  "articles": ["article-id-1", "article-id-2"],
  "frequency": "immediate"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "message": "Newsletter queued for sending",
  "subscribersCount": 42
}
```

**Important**: Queue emails in background job. Don't send in request.

---

### 4. Comments Endpoints

#### POST `/api/articles/:id/comments`

Submit a new comment (public)

**Request Body**:

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "content": "This was a great article! Very inspiring."
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "message": "Comment submitted for moderation"
}
```

**Error Response (400)**:

```json
{
  "error": "Invalid input. Name, email, and content are required."
}
```

**Important**:

- Validate email format
- Sanitize content (remove HTML/scripts)
- Rate limit (1 per email per 1 minute)
- Default to unapproved

---

#### GET `/api/admin/articles/:id/comments`

Get comments for a specific article (admin only)

**Authentication**: Required

**Success Response (200)**:

```json
{
  "pending": [
    {
      "id": "uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "content": "This was a great article!",
      "approved": false,
      "createdAt": "2026-09-01T10:00:00Z"
    }
  ],
  "approved": [
    {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "content": "Amen! Very inspiring.",
      "approved": true,
      "createdAt": "2026-08-28T10:00:00Z"
    }
  ]
}
```

---

#### GET `/api/admin/comments`

Get all comments for moderation (admin only)

**Authentication**: Required

**Query Parameters**:

- `status` (string) - pending, approved, or all
- `limit` (number) - default 50
- `offset` (number) - default 0

**Success Response (200)**:

```json
{
  "comments": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "articleTitle": "Finding Faith in Difficult Times",
      "name": "John Smith",
      "email": "john@example.com",
      "content": "This was a great article!",
      "approved": false,
      "createdAt": "2026-09-01T10:00:00Z"
    }
  ],
  "pending": 5,
  "total": 12
}
```

---

#### PATCH `/api/admin/comments/:id`

Approve or reject a comment (admin only)

**Authentication**: Required

**Request Body**:

```json
{
  "approved": true
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "approved": true
  }
}
```

---

### 5. Series Endpoints

#### POST `/api/admin/articles/:id/series`

Add article to a series (admin only)

**Authentication**: Required

**Request Body**:

```json
{
  "title": "7-Part Series on Faith",
  "description": "A comprehensive guide to understanding faith",
  "position": 2
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "seriesId": "uuid",
    "seriesTitle": "7-Part Series on Faith",
    "position": 2
  }
}
```

---

#### GET `/api/public/articles/series/:slug`

Get all articles in a series

**Example Request**:

```bash
curl "http://localhost:4000/api/public/articles/series/faith-series"
```

**Success Response (200)**:

```json
{
  "series": {
    "id": "uuid",
    "title": "7-Part Series on Faith",
    "slug": "faith-series",
    "description": "A comprehensive guide to understanding faith"
  },
  "articles": [
    {
      "id": "uuid",
      "slug": "article-slug-1",
      "title": "Part 1: Understanding Faith",
      "position": 1,
      "publishedAt": "2026-08-01T10:00:00Z"
    },
    {
      "id": "uuid",
      "slug": "article-slug-2",
      "title": "Part 2: Growing Faith",
      "position": 2,
      "publishedAt": "2026-08-08T10:00:00Z"
    }
  ]
}
```

---

### 6. Audio Upload Endpoint

#### POST `/api/upload/audio`

Upload audio file for article (admin only)

**Authentication**: Required

**Content-Type**: multipart/form-data

**Form Data**:

- `file` (binary) - Audio file (mp3, wav, or ogg)
- `articleId` (string) - Article ID (optional)

**Validation**:

- File type: audio/mpeg, audio/wav, audio/ogg
- Max size: 100MB
- Returns: CDN URL

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/audio/article-550e8400-e29b-41d4-a716-446655440000.mp3"
  }
}
```

**Error Response (400)**:

```json
{
  "error": "File type not supported. Use mp3, wav, or ogg."
}
```

**Example cURL**:

```bash
curl -X POST "http://localhost:4000/api/upload/audio" \
  -H "Authorization: Bearer your_token" \
  -F "file=@article.mp3" \
  -F "articleId=550e8400-e29b-41d4-a716-446655440000"
```

---

### 7. Version History Endpoints

#### GET `/api/admin/articles/:id/versions`

Get version history for an article (admin only)

**Authentication**: Required

**Success Response (200)**:

```json
{
  "versions": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "title": "Finding Faith in Difficult Times",
      "content": "Article content here...",
      "createdAt": "2026-09-01T10:00:00Z",
      "updatedBy": "author-id"
    }
  ]
}
```

**Limit**: Return last 20 versions only.

---

#### POST `/api/admin/articles/:id/versions/:versionId/restore`

Restore an article to a previous version (admin only)

**Authentication**: Required

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "articleId": "uuid",
    "restoredFrom": "version-id",
    "title": "Finding Faith in Difficult Times",
    "createdAt": "2026-09-01T10:00:00Z"
  }
}
```

**Important**: Creates a new version when restoring (don't overwrite).

---

### 8. Translation Endpoints

#### POST `/api/translate/text`

Translate article content

**Request Body**:

```json
{
  "text": "Finding faith in difficult times is challenging but essential.",
  "targetLanguage": "es"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "translatedText": "Encontrar fe en tiempos difíciles es desafiante pero esencial.",
    "translatedTitle": "Encontrando fe en tiempos difíciles",
    "language": "es"
  }
}
```

**Supported Languages**: en, es, fr, it, de, ig, ha, yo

---

#### POST `/api/translate/speak`

Generate text-to-speech audio

**Request Body**:

```json
{
  "text": "Finding faith in difficult times is challenging but essential.",
  "language": "es"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "audioUrl": "https://cdn.example.com/audio/tts/abc123.mp3",
    "duration": 15,
    "language": "es"
  }
}
```

---

#### GET `/api/admin/articles/:id/translations`

Get all cached translations for an article (admin only)

**Authentication**: Required

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "translations": [
      {
        "language": "es",
        "title": "Encontrando fe en tiempos difíciles",
        "content": "Encontrar fe en tiempos difíciles...",
        "audioUrl": "https://cdn.example.com/audio/tts/es-123.mp3",
        "generatedAt": "2026-09-01T10:00:00Z"
      }
    ]
  }
}
```

---

#### POST `/api/admin/articles/:id/translations/generate`

Generate translation for a specific language (admin only)

**Authentication**: Required

**Request Body**:

```json
{
  "language": "fr"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "language": "fr",
    "translatedText": "Trouver la foi en temps difficiles...",
    "audioUrl": "https://cdn.example.com/audio/tts/fr-123.mp3",
    "generatedAt": "2026-09-01T10:00:00Z"
  }
}
```

---

#### PATCH `/api/admin/profile/language`

Update admin's preferred language (admin only)

**Authentication**: Required

**Request Body**:

```json
{
  "language": "es"
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "message": "Language preference updated to Español"
}
```

---

## Database Schema

### Complete SQL Setup

```sql
-- ============================================
-- TAGS & CATEGORIZATION
-- ============================================

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);

CREATE TABLE article_tags (
  articleId UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tagId UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (articleId, tagId),
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_article_tags_articleId ON article_tags(articleId);
CREATE INDEX idx_article_tags_tagId ON article_tags(tagId);

-- ============================================
-- FULL-TEXT SEARCH INDEX
-- ============================================

ALTER TABLE articles ADD COLUMN search_vector tsvector;

CREATE INDEX idx_articles_search ON articles USING gin(search_vector);

-- Trigger to keep search_vector updated:
CREATE FUNCTION update_article_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_search_vector_update BEFORE INSERT OR UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_article_search_vector();

-- ============================================
-- VIEW TRACKING & ANALYTICS
-- ============================================

ALTER TABLE articles ADD COLUMN viewCount INT DEFAULT 0;

CREATE TABLE article_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articleId UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  viewedAt TIMESTAMP DEFAULT NOW(),
  ipHash VARCHAR(255),
  userAgent VARCHAR(255)
);

CREATE INDEX idx_article_views_articleId ON article_views(articleId);
CREATE INDEX idx_article_views_viewedAt ON article_views(viewedAt);

-- Batch update view counts (run periodically):
-- UPDATE articles SET viewCount = (SELECT COUNT(*) FROM article_views WHERE articleId = articles.id)

-- ============================================
-- NEWSLETTER SYSTEM
-- ============================================

CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribedAt TIMESTAMP DEFAULT NOW(),
  unsubscribedAt TIMESTAMP,
  unsubscribeToken VARCHAR(255) UNIQUE,
  verified BOOLEAN DEFAULT FALSE,
  verifiedAt TIMESTAMP
);

CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(unsubscribedAt);

-- ============================================
-- COMMENTS & MODERATION
-- ============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articleId UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW(),
  approvedAt TIMESTAMP,
  approvedBy UUID REFERENCES authors(id)
);

CREATE INDEX idx_comments_articleId ON comments(articleId);
CREATE INDEX idx_comments_approved ON comments(approved);
CREATE INDEX idx_comments_createdAt ON comments(createdAt);

-- ============================================
-- ARTICLE SERIES
-- ============================================

CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorId UUID NOT NULL REFERENCES authors(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_series_authorId ON series(authorId);
CREATE INDEX idx_series_slug ON series(slug);

ALTER TABLE articles ADD COLUMN seriesId UUID REFERENCES series(id);
ALTER TABLE articles ADD COLUMN seriesPosition INT;

CREATE INDEX idx_articles_seriesId ON articles(seriesId);

-- ============================================
-- AUDIO CONTENT
-- ============================================

ALTER TABLE articles ADD COLUMN audioUrl VARCHAR(500);

-- ============================================
-- SCHEDULING
-- ============================================

ALTER TABLE articles ADD COLUMN scheduledPublishAt TIMESTAMP;

CREATE INDEX idx_articles_scheduledPublishAt ON articles(scheduledPublishAt);

-- ============================================
-- VERSION HISTORY
-- ============================================

CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articleId UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  createdBy UUID REFERENCES authors(id)
);

CREATE INDEX idx_article_versions_articleId ON article_versions(articleId);

-- Clean up old versions (keep last 20):
-- DELETE FROM article_versions WHERE articleId = $1 AND id NOT IN (
--   SELECT id FROM article_versions WHERE articleId = $1 ORDER BY createdAt DESC LIMIT 20
-- );

-- ============================================
-- MULTI-LANGUAGE SUPPORT
-- ============================================

ALTER TABLE authors ADD COLUMN preferredLanguage VARCHAR(5) DEFAULT 'en';
ALTER TABLE authors ADD COLUMN enableTranslation BOOLEAN DEFAULT FALSE;

CREATE TABLE article_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  articleId UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  audioUrl VARCHAR(500),
  generatedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(articleId, language)
);

CREATE INDEX idx_article_translations_articleId ON article_translations(articleId);
CREATE INDEX idx_article_translations_language ON article_translations(language);
```

---

## Implementation Priority

### 🔴 Phase 1: Critical (Week 1)

1. **Search + Tags** (8-10 hours) - Core feature, 40-50% impact
2. **View Tracking** (3-4 hours) - Quick win, shows ROI
3. **Newsletter Setup** (2-3 hours) - Get foundation ready

### 🟡 Phase 2: Important (Week 2)

4. **Comments** (6-8 hours) - Community building
5. **Analytics** (included in views) - Dashboard visualization
6. **Series** (4-5 hours) - Content organization

### 🟢 Phase 3: Value-Add (Week 3)

7. **Audio Upload** (4-5 hours) - Accessibility
8. **Scheduling** (4-5 hours) - Admin convenience
9. **Version History** (3-4 hours) - Audit trail

### 🔵 Phase 4: Enhancement (Week 4)

10. **Translation** (10-12 hours) - Global reach
11. **RSS** (0 hours) - Already done!

### Don't Do This ❌

- Don't skip search (it's the foundation)
- Don't build translation before other features
- Don't implement newsletter without background jobs
- Don't store passwords in plain text (ever!)
- Don't forget database indexes (they matter!)

---

## Testing & Deployment

### Local Testing

```bash
# Start backend
cd backend
npm run dev

# In another terminal, test endpoints
curl "http://localhost:4000/api/public/articles?q=faith"
curl -X POST "http://localhost:4000/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test admin endpoints
curl -H "Authorization: Bearer your_token" \
  "http://localhost:4000/api/admin/articles/analytics"
```

### Database Testing

```sql
-- Check tag counts
SELECT COUNT(*) as total_tags FROM tags;

-- Check view tracking
SELECT articleId, COUNT(*) as views FROM article_views GROUP BY articleId;

-- Check pending comments
SELECT COUNT(*) as pending FROM comments WHERE approved = FALSE;

-- Check scheduled articles
SELECT COUNT(*) as pending_publish FROM articles WHERE scheduledPublishAt > NOW() AND status = 'DRAFT';
```

### Performance Testing

1. **Search**: Test with 10k articles, ensure <500ms
2. **Analytics**: Cache results, verify 5-min TTL
3. **Views**: Verify fire-and-forget (return <50ms)
4. **Email**: Queue should handle 100+ sends

### Deployment Checklist

- [ ] Database backed up
- [ ] Environment variables configured
- [ ] CORS headers set correctly
- [ ] File storage configured
- [ ] Email service connected
- [ ] Translation service API key set
- [ ] Background jobs configured
- [ ] Load balancer configured (if needed)
- [ ] SSL/TLS enabled
- [ ] Monitoring/logging setup
- [ ] Error tracking (Sentry, etc.)
- [ ] Rate limiting enabled

---

## Security Checklist

### Authentication & Authorization

- [ ] All admin endpoints require JWT authentication
- [ ] Verify JWT on every request
- [ ] Use secure cookie storage for tokens
- [ ] Implement refresh token rotation
- [ ] Rate limit login attempts

### Data Protection

- [ ] Hash IPs for view tracking (SHA256)
- [ ] Sanitize comment input (remove HTML/scripts)
- [ ] Use parameterized queries (prevent SQL injection)
- [ ] Encrypt sensitive data at rest
- [ ] Use HTTPS only

### File Upload Security

- [ ] Validate file type (whitelist: mp3, wav, ogg)
- [ ] Enforce max file size (100MB)
- [ ] Store files outside web root
- [ ] Generate unique filenames
- [ ] Scan for malware (optional)
- [ ] Set proper CORS headers

### API Security

- [ ] Validate all input data
- [ ] Rate limit public endpoints
- [ ] Add CORS headers
- [ ] Return generic error messages
- [ ] Log suspicious activity
- [ ] Monitor for DDoS

### Privacy & Compliance

- [ ] GDPR: Hash IPs, allow data deletion
- [ ] Newsletter: Support unsubscribe
- [ ] Comments: Get consent before approval
- [ ] Analytics: Don't store PII
- [ ] Cookies: Set SameSite attribute

---

## Integration Checklist

### Pre-Implementation

- [ ] Database set up locally
- [ ] Environment variables configured
- [ ] Email service account created
- [ ] File storage service account created
- [ ] Translation API key obtained
- [ ] TTS API key obtained
- [ ] Queue service running (Redis/RabbitMQ)

### Database Implementation

- [ ] Create all tables from schema
- [ ] Create all indexes
- [ ] Create triggers for search_vector
- [ ] Verify constraints work
- [ ] Test migrations

### API Implementation (Priority Order)

- [ ] Tags system (GET/POST endpoints)
- [ ] Search endpoint (full-text)
- [ ] View tracking endpoint
- [ ] Newsletter endpoints
- [ ] Comments endpoints
- [ ] Series endpoints
- [ ] Audio upload endpoint
- [ ] Scheduling + background job
- [ ] Version history endpoints
- [ ] Translation endpoints

### Background Jobs

- [ ] Setup queue service (Bull/RabbitMQ)
- [ ] Auto-publish job (every 1 min)
- [ ] Newsletter digest job (daily 8am)
- [ ] Cleanup job (weekly)

### External Services

- [ ] Email service connected
- [ ] File storage connected + CORS configured
- [ ] Translation service connected
- [ ] TTS service connected

### Frontend Integration

- [ ] Test search component
- [ ] Test view counter
- [ ] Test newsletter form
- [ ] Test comments section
- [ ] Test audio player
- [ ] Test translator

### Performance & Security

- [ ] Add database indexes
- [ ] Implement caching (Redis)
- [ ] Rate limiting enabled
- [ ] CORS headers set
- [ ] Input validation on all endpoints
- [ ] Error handling consistent

### Testing

- [ ] Unit tests for core functions
- [ ] Integration tests for endpoints
- [ ] Load testing (1k RPS)
- [ ] Security testing
- [ ] End-to-end tests

### Deployment

- [ ] Database backed up
- [ ] All services configured
- [ ] Monitoring setup
- [ ] Error tracking setup
- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Deploy to production
- [ ] Monitor for errors

---

## Clarifying Questions

Before starting implementation, confirm these with the frontend team:

1. **Email Service**: Which service? (Sendgrid, Resend, Mailgun, AWS SES)
2. **File Storage**: AWS S3, Cloudinary, or Vercel Blob?
3. **Translation Service**: Google Translate or DeepL?
4. **TTS Service**: Google Cloud, Azure, or AWS Polly?
5. **Comment Moderation**: Manual or auto-approve first N comments?
6. **Analytics History**: Keep data 90 days or indefinite?
7. **Newsletter Frequency**: Daily or weekly digests?
8. **Database**: PostgreSQL version? (assumes 13+)
9. **Queue Service**: Redis, RabbitMQ, or other?
10. **Timeline**: When do you need first features live?

---

## Support & Documentation

### Frontend Resources

The frontend team has provided:

- ✅ All React components (16 components, ~2000 lines)
- ✅ TypeScript types (fully typed, 0 any types)
- ✅ Component documentation
- ✅ Integration examples

### Files in Repo

1. **BACKEND_IMPLEMENTATION_PROMPT.md** - High-level overview
2. **API_SPECIFICATIONS.md** - Detailed API specs
3. **FEATURES_IMPLEMENTATION.md** - Frontend details
4. **INTEGRATION_GUIDE.md** - How frontend uses APIs
5. **QUICK_REFERENCE.md** - Quick start checklist
6. **COMPLETE_BACKEND_GUIDE.md** - This document!

### Common Questions

**Q: Where do I start?**  
A: Start with Week 1 Phase 1. Search + tags first. It's the foundation for everything else.

**Q: Can I skip a feature?**  
A: You can skip translation initially. Skip RSS feed (it's done). Don't skip search.

**Q: How long will this take?**  
A: 50-72 hours total. 5 weeks with 1-2 developers. Faster if you're experienced with your stack.

**Q: What if I get stuck?**  
A: Check the API spec first. Then check the example cURL commands. Then ask the frontend team.

**Q: Do I need to implement background jobs first?**  
A: No. Do sync features first (search, comments). Background jobs (scheduling, newsletter) can come later.

**Q: Can multiple people work on this?**  
A: Yes! Assign by feature:

- Person A: Search + Tags + Views
- Person B: Newsletter + Comments
- Person C: Series + Audio + Versions
- Person D: Translation

---

## Success Metrics

After implementation, track these:

1. **Search**: <500ms for full-text search on 10k+ articles
2. **Views**: 100+ concurrent users without slowdown
3. **Newsletter**: 95%+ delivery rate
4. **Comments**: <100ms moderation response
5. **Audio**: No buffering on playback
6. **Translation**: <2s for article translation
7. **TTS**: <3s audio file generation
8. **Uptime**: 99.9% availability
9. **Errors**: <0.1% error rate
10. **User Engagement**: 30%+ increase in session duration

---

## Next Steps

1. **Week 1 Planning**: Assign team members to features
2. **Database Setup**: Create tables and indexes
3. **API Scaffolding**: Create endpoint stubs
4. **Local Testing**: Get first feature working locally
5. **Frontend Integration**: Connect to frontend components
6. **Iterate**: Add features one by one

---

**Ready to get started? Good luck! 🚀**

You have everything you need. The frontend is waiting. Make it happen!

---

## Quick Command Reference

### Database Setup

```bash
# Connect to PostgreSQL
psql -U postgres -d pastor_articles_db

# Run all SQL from schema section above
# Verify with:
\dt  # List tables
\d articles  # Describe table
```

### API Testing

```bash
# Search
curl "http://localhost:4000/api/public/articles?q=faith&tag=devotional"

# Subscribe
curl -X POST "http://localhost:4000/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Comment
curl -X POST "http://localhost:4000/api/articles/123/comments" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","content":"Great!"}'

# Translate
curl -X POST "http://localhost:4000/api/translate/text" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","targetLanguage":"es"}'
```

### Useful Links

- PostgreSQL Docs: https://www.postgresql.org/docs/
- Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
- Bull Queue: https://github.com/OptimalBits/bull
- Sendgrid Docs: https://docs.sendgrid.com/
- Google Translate API: https://cloud.google.com/translate/docs

---

**Document Version**: 1.0  
**Last Updated**: September 1, 2026  
**Status**: Ready for Implementation ✅
