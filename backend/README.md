# Pastor Articles — Backend

Express + TypeScript + Prisma API server. Owns the database, authentication,
image uploads, and all business logic. See the repository root README for
how this fits together with `../frontend`.

## 🚀 Quick Start

```bash
npm install          # also runs `prisma generate` via postinstall
cp .env.example .env # fill in DATABASE_URL, AUTH_SECRET, Cloudinary and Paystack keys
npm run db:migrate   # apply all database migrations
npm run db:seed      # creates your admin login from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev          # http://localhost:4000
```

## Subscriptions and roles

New registrations create an `ADMIN` account with a seven-day trial. Paystack
checkout becomes available after the trial. The first account
created by `npm run db:seed` is a `SUPER_ADMIN`; use `SUPER_ADMIN_EMAIL`,
`SUPER_ADMIN_PASSWORD`, and `SUPER_ADMIN_NAME` (the legacy `ADMIN_*` names are
still accepted).

Set these environment variables for Paystack billing:

```env
PAYSTACK_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
PAYSTACK_PLAN_CODE=
PAYSTACK_AMOUNT=
PAYSTACK_CALLBACK_URL=http://localhost:3000/admin/billing?success=1
```

Apply the subscription migration with `npm run db:migrate:deploy` in
production. Configure Paystack to send `charge.success` events to
`/api/billing/webhook`. Paystack does not provide a hosted billing portal or a
guaranteed zero-charge payment-method authorization, so billing is explicitly
started after the local trial ends.

See `QUICK_START.md` for detailed setup guide.

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - 5-minute setup and testing guide
- **[FEATURES_IMPLEMENTATION.md](FEATURES_IMPLEMENTATION.md)** - Complete feature documentation
- **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** - Setup tasks and testing
- **[BACKEND_READY.md](BACKEND_READY.md)** - Implementation summary

## ✨ Features Implemented (11 Total)

1. ✅ **Search & Tags** - Full-text search with tag filtering
2. ✅ **View Tracking & Analytics** - Article view counter and dashboard
3. ✅ **Newsletter System** - Email subscription management
4. ✅ **Comments & Moderation** - Comment submission with approval workflow
5. ✅ **Article Series** - Group articles into series
6. ✅ **Audio Upload** - Upload audio files for articles
7. ✅ **Scheduled Publishing** - Schedule articles to auto-publish
8. ✅ **Version History** - Auto-save article versions with restore
9. ✅ **RSS Feed Ready** - Data endpoints for RSS generation
10. ✅ **Admin Dashboards** - Analytics, comments, newsletter management
11. ✅ **Multi-Language Translation** - 8-language translation with TTS

## Scripts

| Command                     | What it does                               |
| --------------------------- | ------------------------------------------ |
| `npm run dev`               | Runs the API with hot reload (`tsx watch`) |
| `npm run build`             | Compiles TypeScript to `dist/`             |
| `npm start`                 | Runs the compiled server (`dist/index.js`) |
| `npm run db:migrate`        | `prisma migrate dev`                       |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (production)       |
| `npm run db:seed`           | Creates the initial administrator account  |
| `npm run db:studio`         | Opens Prisma Studio                        |

## API Surface

### Existing Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `POST /api/billing/checkout`, `POST /api/billing/portal`,
  `GET /api/billing/subscription`, `POST /api/billing/webhook`
- `GET /api/super-admin/users`, `PATCH /api/super-admin/users/:id/status`,
  `PATCH /api/super-admin/users/:id/role`, `GET /api/super-admin/subscriptions`
- `GET/POST /api/admin/articles`, `GET/PATCH/DELETE /api/admin/articles/:id`
- `GET /api/admin/articles/stats` — all require a valid session cookie
- `GET/PATCH /api/admin/profile`
- `PATCH /api/admin/settings/password`
- `POST /api/admin/upload` — multipart image upload (`file`, `folder`)
- `GET /api/public/profile`, `GET /api/public/articles`,
  `GET /api/public/articles/:slug`, `GET /api/public/sitemap` — no auth
- `POST /api/share` — logs a share event for a published article

### New Endpoints (30+)

**Search & Tags**

- `GET /api/public/search/articles` - Search and filter articles
- `GET /api/public/search/tags` - List all tags
- `POST /api/admin/articles/:id/tags` - Add/update tags

**Analytics**

- `POST /api/public/analytics/:id/views` - Track article view
- `GET /api/public/analytics/:id/stats` - Get article stats
- `GET /api/admin/articles/analytics` - Admin analytics dashboard

**Newsletter**

- `POST /api/newsletter/subscribe` - Subscribe
- `POST /api/newsletter/unsubscribe` - Unsubscribe
- `GET /api/newsletter/subscribers` - View subscribers (admin)
- `POST /api/newsletter/send` - Send newsletter (admin)

**Comments**

- `POST /api/articles/:id/comments` - Submit comment
- `GET /api/articles/:id/comments` - Get comments
- `GET /api/admin/comments` - Manage comments (admin)
- `PATCH /api/admin/comments/:id` - Approve/reject (admin)
- `DELETE /api/admin/comments/:id` - Delete comment (admin)

**Series**

- `POST /api/admin/articles/:id/series` - Create/add to series (admin)
- `GET /api/public/series/:slug` - Get series articles
- `GET /api/admin/series` - List series (admin)
- `PATCH /api/admin/series/:id` - Update series (admin)

**Version History**

- `GET /api/admin/articles/:id/versions` - View versions (admin)
- `POST /api/admin/articles/:id/versions/:versionId/restore` - Restore (admin)

**Translations**

- `POST /api/translate/text` - Translate text
- `POST /api/translate/speak` - Text-to-speech
- `GET /api/translate/articles/:id/translations` - Get translations (admin)
- `POST /api/translate/articles/:id/translations/generate` - Generate (admin)

All admin routes require the `pastor_session` cookie set by `/api/auth/login`.
See the root README for how cross-service cookies work.

## 🎯 Next Steps

1. Run migrations: `npm run db:migrate`
2. Start server: `npm run dev`
3. Test endpoints with curl or Postman
4. Connect frontend to new APIs
5. Configure external services (email, translation, TTS)

See `QUICK_START.md` for detailed instructions!
