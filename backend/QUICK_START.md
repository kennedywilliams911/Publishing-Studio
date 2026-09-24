# Quick Start Guide

## Installation & Setup (5 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Apply database migrations
npm run db:migrate

# Start development server
npm run dev
```

Server running at: **http://localhost:4000** ✅

---

## Test the APIs

### 1. Health Check

```bash
curl http://localhost:4000/health
```

### 2. Search Articles

```bash
curl "http://localhost:4000/api/public/search/articles?q=faith&limit=5"
```

### 3. Get All Tags

```bash
curl "http://localhost:4000/api/public/search/tags"
```

### 4. Subscribe to Newsletter

```bash
curl -X POST "http://localhost:4000/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 5. Submit Comment

```bash
curl -X POST "http://localhost:4000/api/articles/ARTICLE_ID/comments" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "content": "Great article!"
  }'
```

### 6. Track Article View

```bash
curl -X POST "http://localhost:4000/api/public/analytics/ARTICLE_ID/views"
```

---

## Key Endpoints

### Public Routes

- `GET /api/public/search/articles` - Search articles
- `GET /api/public/search/tags` - List all tags
- `POST /api/public/analytics/:id/views` - Track view
- `GET /api/public/analytics/:id/stats` - Get article stats
- `POST /api/articles/:id/comments` - Submit comment
- `GET /api/articles/:id/comments` - Get comments
- `POST /api/newsletter/subscribe` - Subscribe
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `GET /api/public/series/:slug` - Get series articles

### Admin Routes (require authentication)

- `POST /api/admin/articles/:id/tags` - Add tags
- `GET /api/admin/comments` - Manage comments
- `PATCH /api/admin/comments/:id` - Approve/reject comment
- `GET /api/newsletter/subscribers` - View subscribers
- `POST /api/newsletter/send` - Send newsletter
- `POST /api/admin/articles/:id/series` - Create series
- `GET /api/admin/series` - List series
- `GET /api/admin/articles/:id/versions` - Version history
- `POST /api/admin/articles/:id/versions/:versionId/restore` - Restore version
- `GET /api/admin/articles/analytics` - Analytics dashboard

### Translation Routes

- `POST /api/translate/text` - Translate text
- `POST /api/translate/speak` - Text-to-speech
- `GET /api/translate/articles/:id/translations` - Get translations
- `POST /api/translate/articles/:id/translations/generate` - Generate translation

---

## Common Tasks

### Run Database Studio

```bash
npm run db:studio
# Opens browser at http://localhost:5555
```

### Create a New Database Migration

```bash
npm run db:migrate
```

### Seed Database (if seed.ts exists)

```bash
npm run db:seed
```

### Build for Production

```bash
npm run build
```

### Start Production Build

```bash
npm start
```

---

## Environment Variables

Create `.env` file in backend directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pastor_articles_db
FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_APP_URL=http://localhost:3000
```

Optional (for full feature support):

```env
SENDGRID_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
GOOGLE_CLOUD_TTS_KEY=
```

---

## Authentication

All admin endpoints require a Bearer token in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:4000/api/admin/comments
```

Tokens are obtained from the `/api/auth/login` endpoint.

---

## Database Schema Highlights

### New Tables

- `tags` - Article categories/tags
- `article_tags` - Join table
- `article_views` - View tracking
- `newsletter_subscribers` - Email list
- `comments` - Article comments
- `series` - Article series
- `article_versions` - Version history
- `article_translations` - Translations

### Key Relationships

```
Article → Tags (many-to-many)
Article → ArticleViews (one-to-many)
Article → Comments (one-to-many)
Article → Series (many-to-one)
Article → ArticleVersions (one-to-many)
Article → ArticleTranslations (one-to-many)
```

---

## Troubleshooting

### Database Connection Error

```bash
# Check DATABASE_URL in .env
# Make sure PostgreSQL is running
psql -U postgres -d postgres -c "SELECT 1"
```

### Migration Failed

```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually:
npx prisma db push
```

### Port Already in Use

```bash
# Change port in src/index.ts
# Or kill process using port 4000
# Windows: netstat -ano | findstr :4000
# Kill: taskkill /PID <PID> /F
```

### Type Errors

```bash
# Regenerate Prisma types
npx prisma generate

# Rebuild TypeScript
npm run build
```

---

## File Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   │   ├── search.ts    # Search & tags
│   │   ├── analytics.ts # View tracking
│   │   ├── newsletter.ts # Newsletter
│   │   ├── comments.ts  # Comments
│   │   ├── series.ts    # Series
│   │   ├── versions.ts  # Versions
│   │   └── translations.ts # Translations
│   ├── lib/
│   │   ├── helpers.ts   # Utility functions
│   │   ├── jobs.ts      # Background jobs
│   │   ├── auth.ts      # Auth utils
│   │   └── ...
│   ├── middleware/
│   │   └── requireAuth.ts # Auth middleware
│   └── index.ts         # Main server file
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── FEATURES_IMPLEMENTATION.md  # Feature docs
├── IMPLEMENTATION_CHECKLIST.md # Setup guide
└── README.md
```

---

## Next Steps

1. ✅ Database migrated
2. ✅ Server running
3. ➡️ Test endpoints
4. ➡️ Integrate with frontend
5. ➡️ Configure email service
6. ➡️ Configure translation services
7. ➡️ Deploy to production

---

## Documentation

- **Full Feature Guide**: `FEATURES_IMPLEMENTATION.md`
- **Setup Checklist**: `IMPLEMENTATION_CHECKLIST.md`
- **Deployment Ready**: `BACKEND_READY.md`

---

## Support

For issues or questions:

1. Check the error message in console
2. Review endpoint docs in `FEATURES_IMPLEMENTATION.md`
3. Check database with `npm run db:studio`
4. Verify environment variables in `.env`

---

**Ready to build! 🚀**
