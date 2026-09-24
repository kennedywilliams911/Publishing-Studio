# Grace Notes — Pastor Article Publishing Platform

A Christian article publishing platform split into two independently
deployable services:

```
pastor-app/
  backend/    Express + TypeScript + Prisma + PostgreSQL — the API,
              the database, auth, image uploads, everything data-related.
  frontend/   Next.js (App Router) + TypeScript + Tailwind — the public
              website and the admin studio. Talks to the backend over
              HTTP only; it has no database access of its own.
```

Each folder is a standalone project with its own `package.json`,
`.env.example`, and README-level docs below. They can be developed, deployed,
and scaled independently — the only thing they share is the `AUTH_SECRET`
value (see **How auth works across two services**, below) and the backend's
URL.

## Why the frontend is still Next.js, not a plain SPA

The brief calls WhatsApp/Facebook link previews "VERY IMPORTANT." Getting a
proper preview requires the _server_ to respond to Facebook/WhatsApp's
crawler with the right Open Graph tags already in the HTML for that specific
article — a client-side-only React app can't do that (the crawler doesn't
run your JavaScript). So the frontend still runs Next.js Server Components
for the public pages, but those Server Components now call the backend's API
instead of touching a database directly. "Separate backend and frontend"
here means two codebases / two deployments with a clean HTTP boundary
between them — not "no server-rendering."

## Running both locally

**Terminal 1 — backend**

```bash
cd backend
npm install                          # also runs `prisma generate`
cp .env.example .env                 # fill in DATABASE_URL, AUTH_SECRET, Cloudinary keys
npx prisma migrate dev --name init
npm run db:seed                      # creates your admin login
npm run dev                          # http://localhost:4000
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
cp .env.example .env                 # NEXT_PUBLIC_API_URL=http://localhost:4000, same AUTH_SECRET
npm run dev                          # http://localhost:3000
```

Visit `http://localhost:3000` for the public site and
`http://localhost:3000/admin/login` for the admin studio.

## How auth works across two services

- The backend issues a signed JWT session cookie on login (`bcrypt` +
  `jose`). It's the only thing that verifies credentials.
- The frontend's edge middleware guards `/admin/*` routes by decoding that
  same cookie **locally**, using an identical `AUTH_SECRET` — this is why
  both `.env` files must have the same value. It's a fast, stateless check
  for routing purposes; it never modifies or trusts anything beyond "is this
  a validly signed token."
- Every mutating action (creating an article, uploading an image, changing
  the password, etc.) is independently re-authorized by the backend itself.
  The frontend's local check is a UX convenience for redirecting logged-out
  users — it is never the actual security boundary.
- Locally, `localhost:3000` and `localhost:4000` share cookies automatically
  (cookie scoping ignores port numbers — only the host matters, and both are
  "localhost"). In production, if you deploy frontend and backend on
  **different top-level domains**, browser-side actions (uploads, editing,
  etc.) keep working via CORS + `credentials: "include"`, but the frontend's
  own server-side rendering and route guard won't see the session cookie
  (it belongs to the backend's domain). The fix, and the recommended setup,
  is to deploy them on subdomains of one parent domain (e.g.
  `app.yoursite.com` + `api.yoursite.com`) and set `COOKIE_DOMAIN=".yoursite.com"`
  in the backend's env — see the comment in `backend/.env.example`.

## How the article image gets included in shares

Sharing a link on WhatsApp, Facebook, Telegram, or similar platforms never
embeds an image directly in the link itself — there's no such mechanism.
Instead, when someone shares or pastes the article URL, that platform's own
servers fetch the page and read its Open Graph meta tags (`og:image`, etc.)
to build the preview. The article page sets those tags to the article's
featured image (falling back to the pastor's profile photo if the article
has none), watermarked, and cropped to 1200×630 — the standard size these
platforms expect, since an unexpected size is a common reason previews fail
to render at all.

**This means testing locally won't show a real preview** — WhatsApp/Facebook
can't reach `http://localhost:3000` to fetch those tags. To test before
deploying, either deploy to a real (even temporary) public URL, or tunnel
your local server with something like `ngrok` and use Facebook's [Sharing
Debugger](https://developers.facebook.com/tools/debug/) to preview and force
a re-fetch of the tags.

## Watermarking article images

Under **Admin → Settings**, you can turn on a watermark (text, a logo you
upload, or both) that's applied automatically to every article's featured
image and any images inside the article body — including the Open Graph
preview image used for WhatsApp/Facebook link shares.

It's applied at **display time**, by rewriting the Cloudinary image URL with
an overlay transformation, rather than baked into the stored file. That
means:

- Nothing is re-uploaded — turning it on affects every article, past and
  future, immediately.
- Changing the text, logo, opacity, or position later updates every article
  instantly, with no reprocessing step.
- Your original uploaded images stay untouched; the watermark only exists in
  the delivered/served version.

If you update from an earlier version of this project, run
`npx prisma migrate dev` in `backend/` once to add the new watermark columns
to the `profiles` table — the feature won't appear until that migration has
run.

## Voice-to-text (dictation) in the article editor

The article editor's toolbar has a microphone button for dictating articles
by voice. It automatically picks the best available method:

- **Chrome / Edge**: uses the browser's built-in Web Speech API — free,
  instant, no backend involved, no cost. This is unchanged from before.
- **Firefox / Safari** (which don't support that browser API): falls back
  to cloud transcription. Speech is recorded in short ~6-second chunks and
  sent to the backend, which forwards each to OpenAI's transcription API
  and returns the text. This requires `OPENAI_API_KEY` set in the
  backend's `.env` — without it, the mic button simply won't appear in
  these browsers (same as before this fallback existed).

Either way, the experience in the editor is the same: click the mic, allow
microphone access, speak, and finished phrases are inserted at the cursor.
A "Listening…" (or "Transcribing…", during a cloud chunk's brief upload)
indicator shows what's happening.

**Cost**: only the cloud fallback costs anything, and only for people using
Firefox/Safari — roughly $0.003 per minute of speech with the default model
(`gpt-4o-mini-transcribe`). Set `OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe`
in the backend's `.env` for higher accuracy at roughly double the cost, or
leave `OPENAI_API_KEY` unset to disable cloud dictation entirely and only
support Chrome/Edge for free.

## Deploying to production

1. **Backend** — deploy to Railway, Render, Fly.io, or any Node host.
   Provision Postgres (or point at Neon/Supabase) and Cloudinary as before.
   Set `FRONTEND_ORIGIN` to your frontend's URL (for CORS), and set
   `PUBLIC_APP_URL` to the public frontend URL used in email links. If using
   separate top-level domains, set `CROSS_SITE_COOKIES=true`.
2. **Frontend** — deploy to Vercel as usual. Set `NEXT_PUBLIC_API_URL` to
   your live backend URL and `AUTH_SECRET` to the same value as the backend.
3. Run `npx prisma migrate deploy` and the seed script once against your
   production database (from the backend folder, with production
   `DATABASE_URL`/`ADMIN_*` env vars).

## A known limitation of my build environment

I built and verified this in a sandboxed container without general internet
access, so I could never run `prisma generate` / `prisma migrate` there
myself (Prisma's query engine downloads from `binaries.prisma.sh`, which
wasn't reachable). I confirmed everything else compiles cleanly: the backend
type-checks fully except for the two Prisma-namespace types that only exist
after `prisma generate` runs for real (a placeholder client ships until
then), and the frontend now builds with zero errors — including a real bug
I caught and fixed along the way (`useSearchParams()` needed a Suspense
boundary on the login page). The first `npm install` in `backend/` on your
own machine will resolve the Prisma gap automatically.

See `backend/README.md` and `frontend/.env.example` / `backend/.env.example`
for the full environment variable reference.
