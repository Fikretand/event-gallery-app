# Confetti MVP

Private event galleries for photographers, built with Next.js, Supabase, and Cloudflare R2.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase Auth + Postgres + RLS
- Cloudflare R2 with presigned upload/download URLs
- QR code generation for guest uploads
- Sharp-powered image processing for thumbnails and metadata

## Features in this scaffold

- Landing page plus photographer auth screens
- Photographer dashboard with event creation and event settings editing
- Event detail page with links, QR, analytics, pro upload, and gallery moderation
- Public guest upload flow with optional PIN protection
- Private client gallery with PIN gate
- API route handlers for upload sessions, confirmations, processing, downloads, logging, and visibility toggles
- Supabase SQL schema with RLS starter policies plus rate-limit and download logging tables

## Getting started

1. Copy `.env.example` to `.env.local`.
2. Fill in Supabase and R2 credentials.
3. Run the SQL in [supabase/schema.sql](/C:/Users/andel/OneDrive/Documents/Playground/event-gallery-app/supabase/schema.sql).
4. Start the app:

```bash
npm run dev
```

## Production checklist

- Set `NEXT_PUBLIC_APP_URL` to your production HTTPS domain.
- Set `ALLOWED_DEV_ORIGINS` for local LAN testing domains during development.
- Add all env vars to Vercel before deployment.
- Set `CRON_SECRET` in Vercel and keep it private.
- Apply the latest SQL schema to Supabase before deploying new API behavior.
- Configure R2 CORS for your production domain and any local development domains.
- Keep `MEDIA_WORKER_SECRET` private and use it only for trusted processing/retry automation.
- Verify QR scans, guest uploads, downloads, and gallery access on real phones against the production URL.

## Testing

```bash
npm run test
```

## Notes

- Guest uploads are hidden by default until the photographer unhides them.
- Deleted media now uses a 7-day soft-delete window with restore support before permanent cleanup.
- The upload confirm flow now processes images into thumbnails and metadata immediately.
- The `/api/internal/process-media` route remains available for retry/recovery runs on failed uploads.
- `vercel.json` now schedules `/api/internal/purge-deleted-media` once per day at 03:00 UTC. The route accepts either `Authorization: Bearer <CRON_SECRET>` or `x-media-worker-secret`.
- HEIC support depends on Sharp decoding support in your deployment environment and browser preview behavior.
