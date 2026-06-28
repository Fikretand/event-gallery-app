# CLAUDE.md — Confetti Event Gallery App

_Last updated: 2026-05-31._

---

## 1. PROJECT OVERVIEW

**Confetti** is a private event gallery SaaS deployed on Vercel.

- An event organizer (photographer or couple) creates an event and gets two
  links: a **guest upload URL** (shareable via QR code) and a **private
  gallery URL** (PIN-protected).
- Guests upload photos/videos from their phones via QR code — no app, no
  account required.
- The event owner reviews uploads, moderates them, and delivers the curated
  gallery.

**Current state:** Live MVP at `event-gallery-app-rho.vercel.app`. Auth,
event CRUD, guest upload, gallery PIN, media moderation, QR posters, **full
i18n dashboard (EN/BS) with persisted language preference**, **Payhip payment
integration**, **admin panel**, and **Fabric.js QR card editor** are all
shipped. Copy and visuals are still wedding-leaning in places; the data model
is generic.

**Brand name:** Confetti (`appName` in `src/lib/env.ts`).

**Architecture:**
- Next.js 16 App Router, React Server Components for data-fetching pages
- Supabase for auth + PostgreSQL database (free tier — needs Pro before real
  traffic)
- Cloudflare R2 for object storage via `@aws-sdk/client-s3`
- Server Actions (`src/lib/actions.ts`) for all writes
- `sharp` for image thumbnails (server) + `@resvg/resvg-js` for SVG → PNG of
  QR posters
- `fabric@7` for the in-browser QR card editor
- `pdf-lib` to wrap rasterized cards into A4 PDFs
- No client-side state library — RSCs + simple React state

---

## 2. TECH STACK

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | ^0.9 / ^2.99 |
| Object storage | Cloudflare R2 via `@aws-sdk/client-s3` | ^3.1009 |
| Image processing | `sharp` | ^0.34 |
| SVG → PNG (posters) | `@resvg/resvg-js` | ^2.6 |
| In-browser editor | `fabric` | ^7.4 |
| PDF wrapping | `pdf-lib` | ^1.17 |
| QR code | `qrcode` | ^1.5 |
| ZIP download | `jszip` | ^3.10 |
| Testing | Vitest | ^4.1 |
| Linting | ESLint + `eslint-config-next` | ^9 |

**No UI component library** — Tailwind v4 inline styles throughout.

**Brand fonts** (TTF in `/public/fonts/poster/`):
- Playfair Display (serif, italic 600 + bold 700, latin + latin-ext)
- Inter (sans, 500, latin + latin-ext)
- JetBrains Mono (mono, 500, latin + latin-ext)

These are loaded server-side by Resvg for the poster API, and client-side via
`FontFace` API in the Fabric editor.

**Design tokens** (`src/app/globals.css`):
- `--color-paper`: `#f2eadf`, `--color-ink`: `#172033`
- `--color-accent`: `#e27952`, `--color-moss`: `#38584d`
- Background: warm parchment gradient

---

## 3. CURRENT STATE — built and shipped

### Auth + accounts
- Signup (email confirmation), login, password reset, sign out
- Two account types: **photographer** (Solo / Pro) and **couple** (One Event)
- Couple dashboard at `/dashboard/couple`; photographer at `/dashboard`
- Admin role with `/admin/users` panel

### Events
- Create, update, list, permanently delete (slug-based routing)
- `event_settings`, `gallery_sections`, cover image
- Lifecycle status: draft / active / expired

### Guest + photographer upload
- Rate-limited guest upload sessions (`upload_sessions` table)
- PIN protection, file validation, R2 presigned URLs
- Photographer direct upload from dashboard
- `POST /api/uploads/confirm` triggers record creation + thumbnail generation

### Gallery
- PIN-protected public view
- Sectioned by `gallery_sections`
- Per-file hide/unhide, soft-delete, restore, permanent delete (all logged in
  `event_activity`)
- Cover image picker
- ZIP batch download via `jszip`

### Dashboard (full i18n EN + BS)
- `/dashboard` — photographer event list + usage cards + trial banner
- `/dashboard/events/[slug]` — event detail + management
- `/dashboard/events/new` — create event
- `/dashboard/profile` — photographer public profile + language preference
- `/dashboard/billing` — current plan + upgrade
- `/dashboard/couple` — couple landing page

Every page exists in both `/dashboard/...` (English default) and
`/[locale]/dashboard/...` (locale-aware) forms — see §6 for the pattern.

### Language preference (persisted)
- `public.users.preferred_locale` column
- Picker in the profile form
- `redirectIfPreferredLocale(suffix)` helper on every non-locale wrapper
  redirects to the user's saved locale on entry
- Action redirects to `?saved=1` on the new locale URL after a save

### QR features
- **Plain QR PNG download** (client-side blob, no API roundtrip)
- **Server-rendered posters** in 4 templates (Minimal Cream / Confetti Burst
  / Polaroid / Editorial) via `GET /api/events/[slug]/qr-poster` — A4 300 DPI
  PNG or PDF. The `qrPosterPicker` UI for these was removed (everything goes
  through the editor now), but the API + presets stay in tree.
- **Fabric.js QR card editor** at
  `/dashboard/events/[slug]/qr-card-editor` — full-screen edit, drag/resize/
  rotate, font picker (Playfair / Inter / JetBrains Mono), bold/italic,
  colour picker, font-size slider, layer reorder, delete, +text, +image
  (upload). Export at A4 300 DPI PNG or PDF.

### Payments — Payhip (active)
- Active provider, secret + product key set as Vercel env vars
- One Event (€39 couple, key `6VaFA`) checkout fully working via overlay
  (programmatic `Payhip.Checkout.open`) with hosted-checkout fallback
- Photographer subscription products (Solo/Pro mo/yearly) not yet created in
  Payhip — env keys are placeholders
- Webhook at `/api/billing/webhook` — form-encoded `security_token`
  verification, email-based user matching
- LemonSqueezy code paths still present but dormant

### Marketing / public
- Locale-routed marketing pages `/[locale]/...`:
  `/`, `/pricing`, `/for-photographers`, `/for-couples`,
  `/get-started`, `/(auth)/login|signup|signup/verify`,
  `/forgot-password`, `/reset-password`, `/gallery/[slug]`, `/upload/[slug]`
- **Confetti Explainer** — animated portrait-mobile + landscape-desktop story
  on the homepage, using `GalleryAppShell` mock-app screens for the Gallery
  and EventTypes scenes

### Infrastructure
- `src/middleware.ts` (was the stale `proxy.ts` — already fixed) refreshes
  Supabase sessions on every request
- `outputFileTracingIncludes` in `next.config.ts` pins `/public/fonts/poster/
  **/*.ttf` into the qr-poster lambda bundle
- `serverExternalPackages` lists `@resvg/resvg-js` and `sharp` so Turbopack
  doesn't try to bundle their native `.node` binaries

---

## 4. BUSINESS CONTEXT

**Product:** Confetti — private event gallery with guest photo/video upload
via QR code.

| Customer | Plan | Billing | Use case |
|---|---|---|---|
| Photographer | Solo (€19/mo annual, €24/mo monthly) or Pro (€39/mo annual, €49/mo monthly) | Subscription | Pro photographers managing multiple client events |
| Couple / event host | One Event | €39 one-time | One meaningful life event |

**Event scope** is generic (data model supports any event type — only some
marketing copy still leans wedding-centric).

**Dual market:**
- **BiH:** Bosnian UI, affordable pricing, future physical print products
- **Global:** English, premium SaaS positioning

**Photographer plan limits** (`src/lib/constants.ts`):
- Solo: 5 active events, 100 GB live storage
- Pro: 25 active events, 500 GB live storage

**Couple plan limits:** 1 event, 30-day upload window, 90-day gallery access.

**Trial logic** (`computeTrialState`): 7 days OR 20 photos, whichever first.
Bypassed only for admins and active/trialing subscribers.

---

## 5. NEXT-UP / OPEN WORK

Roughly in priority order. Numbered tasks were tracked through this session.

### Test + verify on prod
1. **Run pending Supabase migrations** in the SQL editor (if not done):
   - `supabase/migrations/add_preferred_locale_to_users.sql`
   - `supabase/migrations/add_upload_session_id_to_media.sql` (older)
2. **Verify the Fabric editor on Vercel** after the centering / setZoom /
   charSpacing fix (commit `f4f40a2`). The user reported a layout bug just
   before stepping away — the fix needs eyes on `event-gallery-app-rho`.
3. **Test Payhip webhook end-to-end** with a real €39 purchase — the format
   we implemented (form-encoded `security_token`) may not match what Payhip
   actually sends; the docs describe a newer JSON+signature scheme. We
   wanted to inspect a real payload before hardening. See
   `src/app/api/billing/webhook/route.ts`.

### QR card editor — V2 polish (Fabric.js)
4. Mobile-friendly editor — current UI is desktop-only; mobile users still
   get the "Skini QR" PNG button via `qr-poster-picker`.
5. Shape primitives (rect / circle / line) in the +Add rail.
6. Undo / redo (Fabric.js supports `history` module; not wired yet).
7. Draft persistence in Supabase or localStorage (currently lost on close).
8. More starting templates (target 10–12 — vintage, birthday playful,
   baptism, corporate, anniversary…).
9. "Reset to template defaults" button.
10. Possibly an Open-in-Canva fallback (just a link + instructions; no API
    integration).

### Dashboard polish
11. Translate the inner forms that are still English-only inside the
    bilingual chrome: `EventSettingsForm`, `EventCreateForm`,
    `PhotographerProfileForm`, `MediaGrid` action labels,
    `GallerySectionsManager`, `BillingPlans`, `EventLifecyclePanel`.
12. Real testimonials in `src/lib/marketing.ts:106` (currently fabricated
    placeholders — `Studio Nova Weddings`, `Lejla & Harun`, etc.).
13. Expand event-type copy: rename "One Wedding" wording, update `/for-couples`
    to be event-host-generic.

### Payments
14. Create Payhip subscription products for Solo/Pro mo/yearly + wire
    `LEMONSQUEEZY_VARIANT_*` env vars to `PAYHIP_PRODUCT_*` (the LemonSqueezy
    paths are dormant fallbacks).
15. Admin "manual activate plan" action — for buyers whose Payhip checkout
    email didn't match their account email and the webhook couldn't auto-
    activate.

### Hardening / deploy hygiene
16. `.env.example` documenting every var (Supabase, R2, Payhip, APP_SECRET,
    NEXT_PUBLIC_APP_URL).
17. `vercel.json` with function-timeout bumps if media processing exceeds
    10s default.
18. PIN hashing → bcrypt/argon2 (currently SHA-256 — fast / GPU-crackable;
    4-digit PINs only 10k combinations).
19. Auth on `/api/uploads/confirm` — still requires only that the supplied
    object key was issued via the presign route. Tighten to a signed grant
    or require session.
20. APP_SECRET production presence-check at startup (gallery cookies rely on
    it; default secret is in source).

### Future / ideas parked
- Video thumbnail extraction (currently videos go straight to `ready` with
  no thumbnail and no duration).
- Email notifications (post-upload, expiry).
- Physical print product shop (BiH market).

---

## 6. KEY PATTERNS — please follow

### i18n (dashboard pages)
Mirror the CoupleDashboard pattern:
- `src/app/dashboard/{foo}/{Foo}.tsx` — shared async component that takes
  `locale: Locale` (+ optional `searchParams`) and renders everything via
  `getDictionary(locale).dashboard.foo`.
- `src/app/dashboard/{foo}/page.tsx` — thin wrapper, passes `locale="en"`.
- `src/app/[locale]/dashboard/{foo}/page.tsx` — thin wrapper, awaits
  `params.locale`, passes through.
- Internal links inside the shared component use
  `localePrefix(locale)` from `src/lib/i18n/index.ts` (handles `""` for `en`,
  `/bs` for non-default).
- New strings go in `Dict.dashboard.*` (`src/lib/i18n/index.ts`) + both
  `en.ts` and `bs.ts`. `t()` interpolates `{{name}}` placeholders.

### Dashboard page entry
Non-locale wrappers call `await redirectIfPreferredLocale("/suffix")` first
(from `src/lib/i18n/preference.ts`) so logged-in users with a non-default
preference land on `/{pref}/dashboard/{suffix}` automatically. Locale-prefixed
wrappers trust the URL and never redirect.

### Security guardrails
- Never expose service-role keys client-side.
- Always validate ownership before any write — `user_id` on events/media.
- Don't trust client-supplied `eventId`, `mediaId`, `slug` without
  `getOwnerEventBySlug` style verification.
- Flag any new unauthenticated API endpoint loudly.

### Supabase free-tier ceiling
500 MB DB + 2 GB bandwidth — exhausted by any real traffic with image
previews. Migrate to Pro before user testing scales.

---

## 7. WHAT NOT TO TOUCH

Stable + correct; refactor only if a task explicitly requires it.

- `src/lib/security.ts` — PIN hashing + `timingSafeEqual`, gallery cookie
  signing, IP hashing.
- `src/lib/rate-limit.ts` — DB-backed limiter + in-memory fallback.
- `src/lib/upload-validation.ts` — file type/size/count guards.
- `src/lib/storage.ts` — R2 client + all presigned URL helpers.
- `src/lib/supabase/` — three clients (browser, server, admin).
- `src/lib/utils.ts` — `slugify`, `formatBytes`, `formatDate`, `cn`,
  `absoluteUrl`.
- `src/lib/env.ts` — env parsing + availability flags.
- `src/lib/i18n/{en,bs,index}.ts` — adding keys is fine; renaming the loader
  or `Dict` shape ripples everywhere.
- `src/components/upload-dropzone.tsx`, `src/components/media-grid.tsx` —
  tested against the full presign → upload → confirm + moderation flow.
- DB schema — never rename tables/columns without a `supabase/migrations/`
  entry.

---

## 8. KEY FILE MAP

```
src/
├── app/
│   ├── [locale]/                       # Locale-aware mirrors of every
│   │   ├── (auth)/{login,signup,…}     #   user-facing route
│   │   ├── dashboard/{…}
│   │   ├── admin/{…}
│   │   ├── for-photographers, for-couples, pricing, get-started
│   │   ├── gallery/[slug], upload/[slug]
│   │   └── page.tsx                    # locale-aware landing
│   ├── page.tsx                        # English landing
│   ├── layout.tsx
│   ├── globals.css                     # Tokens + utility classes
│   │
│   ├── dashboard/
│   │   ├── page.tsx          → DashboardHome.tsx (shared)
│   │   ├── events/
│   │   │   ├── new/          → NewEvent.tsx (shared)
│   │   │   └── [slug]/
│   │   │       ├── page.tsx  → EventDetail.tsx (shared)
│   │   │       └── qr-card-editor/page.tsx → renders QrCardEditor
│   │   ├── profile/          → DashboardProfile.tsx (shared)
│   │   ├── billing/          → DashboardBilling.tsx (shared)
│   │   └── couple/           → CoupleDashboard.tsx (shared)
│   │
│   ├── admin/{page, users/{page, [id]/page}, layout, admin-sidebar}.tsx
│   │
│   └── api/
│       ├── events/[slug]/{guest-upload-session, photographer-upload-session,
│       │                  media, cover, qr, qr-poster}/route.ts
│       ├── uploads/confirm/route.ts      # ⚠ still no auth
│       ├── media/[id]/{toggle-hidden,delete,permanent-delete,restore,
│       │               download,section}/route.ts
│       ├── media/download-batch/route.ts # ZIP
│       ├── qr-card/pdf/route.ts          # editor → PDF wrapper
│       ├── billing/{checkout, webhook}/route.ts
│       └── internal/{process-media, purge-deleted-media}/route.ts
│
├── lib/
│   ├── types.ts, constants.ts, env.ts, utils.ts
│   ├── events.ts                    # ~1.5k LoC of event + media logic
│   ├── actions.ts                   # All Server Actions
│   ├── media.ts                     # Upload grants + thumbnails
│   ├── storage.ts, security.ts, rate-limit.ts, upload-validation.ts
│   ├── auth.ts, account.ts, marketing.ts
│   ├── billing.ts                   # Payhip + LemonSqueezy helpers
│   ├── qr-posters.ts                # 4 SVG poster templates
│   ├── qr-posters-render.ts         # Resvg + pdf-lib pipeline
│   ├── qr-posters-fonts.ts          # TTF paths for Resvg
│   ├── qr-card-editor/presets.ts    # Fabric editor starting points
│   └── i18n/
│       ├── index.ts                 # Dict, getDictionary, t, localePrefix
│       ├── en.ts, bs.ts             # Translations
│       └── preference.ts            # redirectIfPreferredLocale
│
├── middleware.ts                    # Supabase session refresh
│
└── components/
    ├── ui/{button, input, panel}.tsx
    ├── upload-dropzone.tsx
    ├── media-grid.tsx
    ├── collapsible-section.tsx      # Gallery manager collapser
    ├── qr-poster-picker.tsx         # Plain QR + "Prilagodi" buttons
    ├── qr-card-editor.tsx           # Fabric.js editor
    ├── event-create-form.tsx, event-settings-form.tsx
    ├── event-lifecycle-panel.tsx
    ├── gallery-sections-manager.tsx
    ├── auth-form.tsx, site-nav.tsx
    ├── dashboard-header.tsx, dashboard-event-list.tsx
    ├── photographer-profile-form.tsx, setup-notice.tsx
    ├── pricing-showcase.tsx, marketing-button-link.tsx
    ├── marketing-testimonials.tsx   # ⚠ placeholder data
    └── marketing-trust-strip.tsx
```

---

## 9. RECENT SESSION LOG

Newest first — useful for picking back up.

- `f4f40a2` — Editor centering fix (originX='center' for textAlign='center'
  text) + setZoom-based scaling + safe export (save/restore zoom around
  high-res render) + presets charSpacing converted from SVG-px to Fabric
  1/1000em.
- `389e885` — Editor canvas fit-to-stage via `ResizeObserver`; font picker
  (Playfair / Inter / JetBrains Mono) + B / I toggles; QR poster picker
  simplified to two buttons + hint.
- `3fa61bc` — Fabric.js QR card editor v1 (route, presets, full editor UI,
  `/api/qr-card/pdf` wrapper).
- `291adbe` — Stat cards locked to permanent 2-col grid; gallery manager
  wrapped in `<CollapsibleSection>` (12-item threshold, soft fade);
  recent-activity panel inside native `<details>`.
- `b3661b5` — Mobile explainer scenes rebuilt around `GalleryAppShell`.
- `1c7ec30` — Stat-card layout, removed broken header EN/BS switcher, saved
  banner survives the locale-flip redirect.
- `837ee3c` — Persisted dashboard language preference (migration + profile
  picker + `redirectIfPreferredLocale`).
- `ec31ab2` — Bilingual dashboard (option C) — five pages refactored to
  shared async components.
