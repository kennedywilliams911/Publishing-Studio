# API Specifications for New Features

This document outlines all backend API endpoints needed to support the 10 new features implemented in the frontend.

## Authentication and Email Verification

### POST `/api/auth/request-otp`

Validate the email address, rate-limit requests, create a short-lived single-use OTP, and send it through the configured email provider.

Request:

```json
{ "email": "user@example.com" }
```

Response:

```json
{ "message": "Verification code sent" }
```

### POST `/api/auth/register`

Create the account only after the submitted OTP is valid, unexpired, and unused. The backend must validate the email again, hash the password, invalidate the OTP, and issue the session cookie.

Request:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "at-least-8-characters",
  "otp": "123456"
}
```

The backend should use an email provider such as SendGrid, Resend, Mailgun, or AWS SES and keep the provider credentials server-side.

## 1. Search & Categories/Tags

### GET `/api/public/articles`

**Enhanced with search and tag filtering**

Query params:

- `q` (string) - Search query for full-text search
- `tag` (string) - Filter by tag slug
- `limit` (number) - Items per page (default: 12)
- `offset` (number) - Pagination offset

Response:

```json
{
  "items": [
    {
      "id": "...",
      "title": "...",
      "slug": "...",
      "tags": [{ "id": "...", "name": "...", "slug": "..." }],
      "viewCount": 234
    }
  ],
  "total": 150
}
```

### GET `/api/admin/tags`

List all available tags

Response:

```json
{
  "tags": [{ "id": "...", "name": "...", "slug": "..." }]
}
```

### POST `/api/admin/articles/:id/tags`

Add/update tags for an article

Body:

```json
{
  "tags": [{ "id": "...", "name": "...", "slug": "..." }]
}
```

---

## 2. View Tracking

### POST `/api/public/articles/:id/views`

Track article view (fire-and-forget endpoint)

### GET `/api/public/articles/:id/stats`

Get article view count and engagement

Response:

```json
{
  "viewCount": 1234,
  "shares": 45,
  "comments": 12
}
```

### GET `/api/admin/articles/analytics`

Admin analytics dashboard

Query params:

- `period` (week|month|all) - Time period

Response:

```json
{
  "articles": [
    {
      "id": "...",
      "title": "...",
      "viewCount": 1234,
      "shares": 45,
      "comments": 12
    }
  ],
  "period": "month"
}
```

---

## 3. Article Series

### POST `/api/admin/articles/:id/series`

Add article to a series

Body:

```json
{
  "title": "7-Part Series on Faith",
  "description": "...",
  "position": 2
}
```

Response:

```json
{
  "seriesId": "..."
}
```

### GET `/api/public/articles/series/:slug`

Get all articles in a series

Response:

```json
{
  "series": {
    "id": "...",
    "title": "...",
    "slug": "...",
    "description": "..."
  },
  "articles": [{ "id": "...", "slug": "...", "title": "...", "position": 1 }]
}
```

---

## 4. Schedule Publishing

### PATCH `/api/admin/articles/:id`

Enhanced to support scheduling

Body:

```json
{
  "scheduledPublishAt": "2026-09-15T10:00:00Z"
}
```

### Background Job

Create a scheduled job to publish articles when `scheduledPublishAt` reaches current time.

---

## 5. Newsletter

### POST `/api/newsletter/subscribe`

Subscribe email to newsletter

Body:

```json
{
  "email": "user@example.com"
}
```

Response:

```json
{
  "success": true,
  "message": "Subscribed successfully"
}
```

### POST `/api/newsletter/unsubscribe`

Unsubscribe email

Body:

```json
{
  "email": "user@example.com",
  "token": "unsubscribe_token"
}
```

### GET `/api/admin/newsletter/subscribers`

List newsletter subscribers

Response:

```json
{
  "subscribers": [
    {
      "id": "...",
      "email": "...",
      "subscribedAt": "...",
      "unsubscribedAt": null
    }
  ],
  "active": 42
}
```

### POST `/api/admin/newsletter/send`

Send newsletter to subscribers

Body:

```json
{
  "subject": "New Articles This Week",
  "articles": ["article-id-1", "article-id-2"]
}
```

---

## 6. Comments

### POST `/api/articles/:id/comments`

Submit a comment (public)

Body:

```json
{
  "name": "John",
  "email": "john@example.com",
  "content": "Great article!"
}
```

### GET `/api/admin/articles/:id/comments`

Get comments for an article (admin view)

Response:

```json
{
  "pending": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "content": "...",
      "approved": false,
      "createdAt": "..."
    }
  ],
  "approved": [
    { "id": "...", "name": "...", "content": "...", "approved": true }
  ]
}
```

### PATCH `/api/admin/comments/:id`

Approve or delete a comment

Body:

```json
{
  "approved": true
}
```

### GET `/api/admin/comments`

Get all comments across articles for moderation

---

## 7. Audio Versions

### POST `/api/upload/audio`

Upload audio file

Form data:

- `file` (multipart/form-data) - MP3/WAV/OGG file

Response:

```json
{
  "url": "https://cdn.example.com/audio/article-123.mp3"
}
```

### PATCH `/api/admin/articles/:id`

Enhanced to support audio

Body:

```json
{
  "audioUrl": "https://cdn.example.com/audio/article-123.mp3"
}
```

---

## 8. Article Versions/History

### GET `/api/admin/articles/:id/versions`

Get version history for an article

Response:

```json
{
  "versions": [
    {
      "id": "...",
      "articleId": "...",
      "title": "...",
      "content": "...",
      "createdAt": "...",
      "updatedBy": "..."
    }
  ]
}
```

### POST `/api/admin/articles/:id/versions/:versionId/restore`

Restore an old version

---

## 9. Social Meta Tags

### Enhance GET `/api/public/articles/:slug`

Add social preview fields

Response includes:

```json
{
  "title": "...",
  "excerpt": "...",
  "featuredImage": "...",
  "publishedAt": "...",
  "author": { "name": "...", "image": "..." }
}
```

Use these in Next.js metadata to generate:

- `og:title`, `og:description`, `og:image`
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

---

## 10. RSS Feed

### GET `/feed.xml`

Already implemented on frontend as route handler at `/app/feed.xml/route.ts`

This fetches from `/api/public/articles?limit=50` and transforms to RSS XML.

---

## 11. Multi-Language Translation + Text-to-Speech

### POST `/api/translate/text`

Translate article content to a target language

Request:

```json
{
  "text": "Article content here...",
  "targetLanguage": "es"
}
```

Response:

```json
{
  "translatedText": "Contenido del artículo aquí...",
  "translatedTitle": "Optional translated title"
}
```

### POST `/api/translate/speak`

Generate audio/speech from text in a specific language

Request:

```json
{
  "text": "Article content to speak",
  "language": "es"
}
```

Response:

```json
{
  "audioUrl": "https://cdn.example.com/audio/123.mp3"
}
```

### GET `/api/admin/articles/:id/translations`

Retrieve all cached translations for an article

Response:

```json
{
  "translations": [
    {
      "language": "es",
      "title": "Título traducido",
      "content": "Contenido traducido...",
      "audioUrl": "https://cdn.example.com/audio/es-123.mp3",
      "generatedAt": "2026-09-01T10:00:00Z"
    }
  ]
}
```

### POST `/api/admin/articles/:id/translations/generate`

Generate or regenerate translation for a specific language

Request:

```json
{
  "language": "fr"
}
```

Response:

```json
{
  "language": "fr",
  "translatedText": "Contenu d'article traduit...",
  "audioUrl": "https://cdn.example.com/audio/fr-123.mp3",
  "generatedAt": "2026-09-01T10:00:00Z"
}
```

### PATCH `/api/admin/profile/language`

Update admin's preferred language and translation settings

Request:

```json
{
  "language": "es"
}
```

Response:

```json
{
  "success": true,
  "message": "Language preference updated"
}
```

**Supported Languages**:

- `en` - English
- `es` - Spanish (Español)
- `fr` - French (Français)
- `it` - Italian (Italiano)
- `de` - German (Deutsch)
- `ig` - Igbo
- `ha` - Hausa
- `yo` - Yoruba (Yorùbá)

---

## Database Schema Extensions

```sql
-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Article-Tag junction
CREATE TABLE article_tags (
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  tagId UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (articleId, tagId)
);

-- Series table
CREATE TABLE series (
  id UUID PRIMARY KEY,
  authorId UUID REFERENCES authors(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Update articles table
ALTER TABLE articles ADD COLUMN (
  seriesId UUID REFERENCES series(id),
  audioUrl VARCHAR(255),
  scheduledPublishAt TIMESTAMP,
  viewCount INT DEFAULT 0
);

-- Article views tracking
CREATE TABLE article_views (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  viewedAt TIMESTAMP DEFAULT NOW(),
  ipHash VARCHAR(255)
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscribedAt TIMESTAMP DEFAULT NOW(),
  unsubscribedAt TIMESTAMP
);

-- Article versions
CREATE TABLE article_versions (
  id UUID PRIMARY KEY,
  articleId UUID REFERENCES articles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedBy UUID REFERENCES authors(id)
);

-- Article translations
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

-- Update authors table
ALTER TABLE authors ADD COLUMN (
  preferredLanguage VARCHAR(5) DEFAULT 'en',
  enableTranslation BOOLEAN DEFAULT FALSE
);
```

---

## Implementation Priority

1. **Tags/Search** - Core content discovery (highest impact)
2. **View Count Tracking** - Simple, high engagement value
3. **Newsletter** - Drives recurring traffic
4. **Comments** - Community building
5. **Audio Upload** - Accessibility feature
6. **Series** - Content organization
7. **Scheduling** - Admin convenience
8. **Analytics** - Insights for admin
9. **Versions** - Article management
10. **RSS** - Already implemented frontend-side
11. **Translation** - Global reach and accessibility (10-12 hours)
