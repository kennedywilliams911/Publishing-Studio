# Backend Implementation Quick Reference

**Print this or share with your backend team!**

---

## Quick Setup (Copy-Paste Ready)

### 1. Add Database Tables

```sql
-- Tags & Categories
CREATE TABLE tags (id UUID PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL);
CREATE TABLE article_tags (articleId UUID REFERENCES articles(id) ON DELETE CASCADE, tagId UUID REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (articleId, tagId));

-- Series
CREATE TABLE series (id UUID PRIMARY KEY, authorId UUID REFERENCES authors(id), title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE NOT NULL, description TEXT);
ALTER TABLE articles ADD COLUMN seriesId UUID REFERENCES series(id);

-- Views
ALTER TABLE articles ADD COLUMN viewCount INT DEFAULT 0;
CREATE TABLE article_views (id UUID PRIMARY KEY, articleId UUID REFERENCES articles(id), viewedAt TIMESTAMP, ipHash VARCHAR(64));

-- Comments
CREATE TABLE comments (id UUID PRIMARY KEY, articleId UUID REFERENCES articles(id), name VARCHAR(255), email VARCHAR(255), content TEXT, approved BOOLEAN DEFAULT FALSE, createdAt TIMESTAMP);

-- Newsletter
CREATE TABLE newsletter_subscribers (id UUID PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, subscribedAt TIMESTAMP, unsubscribedAt TIMESTAMP);

-- Versions
CREATE TABLE article_versions (id UUID PRIMARY KEY, articleId UUID REFERENCES articles(id), title VARCHAR(255), content TEXT, createdAt TIMESTAMP, updatedBy UUID);

-- Audio & Scheduling
ALTER TABLE articles ADD COLUMN audioUrl VARCHAR(500);
ALTER TABLE articles ADD COLUMN scheduledPublishAt TIMESTAMP;

-- Translations
CREATE TABLE article_translations (id UUID PRIMARY KEY, articleId UUID REFERENCES articles(id) ON DELETE CASCADE, language VARCHAR(5), title VARCHAR(255), content TEXT, audioUrl TEXT, generatedAt TIMESTAMP, UNIQUE(articleId, language));
ALTER TABLE authors ADD COLUMN preferredLanguage VARCHAR(5) DEFAULT 'en';
ALTER TABLE authors ADD COLUMN enableTranslation BOOLEAN DEFAULT FALSE;
```

### 2. Implement 20 API Endpoints

**Search** (6)

- GET `/api/public/articles?q=...&tag=...&limit=12`
- GET `/api/public/tags`
- POST `/api/admin/articles/:id/tags`

**Views** (2)

- POST `/api/public/articles/:id/views`
- GET `/api/admin/articles/analytics?period=week|month|all`

**Newsletter** (4)

- POST `/api/newsletter/subscribe`
- POST `/api/newsletter/unsubscribe`
- GET `/api/admin/newsletter/subscribers`
- POST `/api/admin/newsletter/send`

**Comments** (4)

- POST `/api/articles/:id/comments`
- GET `/api/admin/comments`
- GET `/api/admin/articles/:id/comments`
- PATCH `/api/admin/comments/:id`

**Series** (2)

- POST `/api/admin/articles/:id/series`
- GET `/api/public/articles/series/:slug`

**Audio** (1)

- POST `/api/upload/audio`

**Versions** (1)

- GET `/api/admin/articles/:id/versions`
- POST `/api/admin/articles/:id/versions/:versionId/restore`

**Translation** (4)

- POST `/api/translate/text`
- POST `/api/translate/speak`
- GET `/api/admin/articles/:id/translations`
- POST `/api/admin/articles/:id/translations/generate`

### 3. Setup Background Jobs

1. **Auto-Publish** (every 1 min) - Publish articles where `scheduledPublishAt <= NOW()`
2. **Newsletter Digest** (daily 8am) - Send emails to subscribers
3. **Cleanup** (weekly) - Delete old view records

### 4. Add External Services

- **Email**: Sendgrid, Resend, or similar
- **Storage**: S3, Cloudinary, or Vercel Blob

---

## Response Format Template

All responses should follow this format:

**Success (200)**:

```json
{
  "success": true,
  "data": {
    /* your data */
  }
}
```

**Error (4xx/5xx)**:

```json
{
  "error": "Human readable error message"
}
```

---

## Testing URLs

Once implemented, test these:

```bash
# Search
curl "http://localhost:4000/api/public/articles?q=faith&tag=devotional"

# View tracking
curl -X POST "http://localhost:4000/api/public/articles/123/views"

# Newsletter
curl -X POST "http://localhost:4000/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Comments
curl -X POST "http://localhost:4000/api/articles/123/comments" \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","content":"Great article"}'

# Series
curl "http://localhost:4000/api/public/articles/series/faith-series"

# Audio upload
curl -X POST "http://localhost:4000/api/upload/audio" \
  -F "file=@article.mp3"

# Analytics
curl "http://localhost:4000/api/admin/articles/analytics?period=month"

# Translation
curl -X POST "http://localhost:4000/api/translate/text" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","targetLanguage":"es"}'

# Text-to-speech
curl -X POST "http://localhost:4000/api/translate/speak" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","language":"en"}'
```

---

## Time Breakdown

| Feature       | Hours     | Difficulty    |
| ------------- | --------- | ------------- |
| Tags/Search   | 8-10      | Medium        |
| View Tracking | 3-4       | Easy          |
| Newsletter    | 6-8       | Hard          |
| Comments      | 6-8       | Medium        |
| Audio         | 4-5       | Medium        |
| Series        | 4-5       | Easy          |
| Scheduling    | 4-5       | Hard          |
| Analytics     | 3-4       | Medium        |
| Versions      | 3-4       | Easy          |
| RSS           | 0         | Frontend only |
| Translation   | 10-12     | Hard          |
| **Total**     | **50-72** |               |

---

## Key Implementation Tips

1. **Search**: Use PostgreSQL `@@ to_tsquery()` for full-text search
2. **Views**: Batch insert every 100 views for performance
3. **Newsletter**: Queue emails in background, return immediately
4. **Comments**: Add rate limiting to prevent spam
5. **Audio**: Validate file type and size server-side
6. **Series**: Return articles in position order
7. **Scheduling**: Use cron job or similar scheduler
8. **Analytics**: Cache results for 10 minutes
9. **Versions**: Auto-save on every PATCH, limit to 20 per article
10. **RSS**: Ensure article data has all required fields

---

## Security Essentials

✅ Validate all file uploads (mime type, size)  
✅ Hash IPs for view tracking (GDPR)  
✅ Require email verification for comments  
✅ Use secure tokens for unsubscribe links  
✅ Rate limit public endpoints  
✅ Authenticate all admin endpoints  
✅ CORS headers on file storage

---

## Questions?

See full documentation:

- `API_SPECIFICATIONS.md` - Complete endpoint specs
- `FEATURES_IMPLEMENTATION.md` - Frontend details
- `BACKEND_IMPLEMENTATION_PROMPT.md` - Full requirements

---

## Priority Order

1. Tags/Search (highest ROI)
2. View Tracking (quick win)
3. Newsletter (recurring traffic)
4. Comments (community)
5. Everything else

Start with #1, don't move to #2 until #1 is complete!
