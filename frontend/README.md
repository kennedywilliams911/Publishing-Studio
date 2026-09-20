# Pastor Articles — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS. The public website and the
admin studio. This app has no database access of its own — every read and
write goes through the backend API in `../backend`. See the repository root
README for how the two fit together, including how auth works across the
two services.

## Setup

```bash
npm install
cp .env.example .env   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL, AUTH_SECRET
npm run dev             # http://localhost:3000
```

`AUTH_SECRET` must exactly match the backend's `AUTH_SECRET` — the frontend's
edge middleware decodes the session cookie locally (for fast route-guarding
of `/admin/*`), but the backend is the only thing that actually issues or
authorizes sessions.

The backend must be running (default `http://localhost:4000`) for this app
to have any data to show — the homepage, article pages, and every admin page
fetch from it.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Runs the production build |
| `npm run lint` | ESLint |

## Structure

```
src/
  app/
    page.tsx                 Public homepage
    articles/                Public browse + article detail (SSR, for
                              WhatsApp/Facebook/SEO link previews)
    admin/
      login/                 Public login page
      (dashboard)/            Protected admin pages — sidebar layout,
                              guarded by src/middleware.ts
    sitemap.ts, robots.ts
  components/
    admin/                   Editor, image uploader, list items, dialogs
    public/                  Header, footer, article card/reader
    editor/                  Rich text editor (Tiptap)
  lib/
    api.ts                   Server-side fetch helper (forwards cookies
                              during SSR so authenticated admin pages and
                              public SEO pages both render correctly)
    api-client.ts             Browser-side fetch helper
    auth.ts                   Read-only session decode, for display only
  middleware.ts               Edge auth guard for /admin/*
```
