# CLAUDE.md — Confetti Event Gallery App

_Last updated: 2026-09-20._

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
i18n (EN/BS) across dashboard _and_ the inner forms**, **Polar + Payhip
payment integration**, **admin panel** (incl. manual plan activation), and a
**Fabric.js QR card editor** (10 templates, undo/redo, centre snapping,
shapes, draft autosave, mobile layout) are all shipped.

Also shipped: redesigned public gallery (bilingual, photo-tile grid,
portalled full-screen viewer), landing photo mosaic, a 3D Three.js hero loop
and the Confetti explainer (both lazy-loaded), client-extracted video poster
thumbnails, branded error/404 pages, draft legal pages, and a pre-launch
security pass (scrypt PINs, expiring signed upload grants).

Copy is now event-generic; the data model always was.

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
| Payments (MoR) | `@polar-sh/sdk` | ^0.49 |
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
  rotate, font picker, bold/italic, colour picker, font-size slider, layer
  reorder, delete, +text, +image, +shapes (rect/circle/line). Undo/redo,
  centre-snap guides, localStorage draft autosave + reset, and a mobile
  layout (bottom sheets). **10 templates** across event types — see
  `src/lib/qr-card-editor/presets.ts`, geometry-guarded by `presets.test.ts`.
  Export at A4 300 DPI PNG or PDF.

### Payments — Polar (preferred) + Payhip (fallback)

**Polar** (Merchant of Record — handles VAT/invoicing) is the provider the code
now prefers. `POST /api/billing/checkout` creates a Polar checkout via
`@polar-sh/sdk` whenever `POLAR_ACCESS_TOKEN` **and** a product id for the
requested plan are set, and falls through to Payhip / LemonSqueezy otherwise.

- The buyer's account id travels in `metadata.userId` + `externalCustomerId`,
  so the webhook activates the exact account — no email-matching guesswork.
- Webhook: `/api/billing/polar/webhook` (503 until `POLAR_WEBHOOK_SECRET` is
  set). Handles `order.created` (only once paid), `order.paid`,
  `order.refunded` and the `subscription.*` lifecycle; anything else is
  acknowledged and ignored. A 100%-discount test order announces itself
  through `order.created` and never `order.paid`, hence the first case.
- **Do not verify with the SDK's `validateEvent` alone.** Polar's endpoints
  report `uses_standard_webhook_signature: true`, meaning the HMAC key is the
  base64-*decoded* secret (32 raw bytes). `validateEvent` instead keys on
  `utf8(secret)`, so it rejects every delivery from such an endpoint — a 403
  that looks exactly like a wrong secret. The route therefore does Standard
  Webhooks verification itself with `node:crypto`, trying all three key
  derivations in `polarWebhookKeys` and logging which matched, then re-signs
  with the SDK's key purely to reuse its typed parsing. Confirmed against a
  real sandbox delivery: 403 under the SDK derivations, 200 once
  `base64(bare)` was included.
- Prices are quoted in the currency the active provider charges. One Event is
  **79,00 KM** (`ONE_EVENT_PRICE`); Solo and Pro come from `PLAN_PRICING_BAM`
  — 49 / 39 KM and 99 / 79 KM per month, yearly billing twelve of those at
  once. `planPricingFor()` picks the BAM or EUR table so the plan chooser can
  never quote a price the checkout will not charge.
- After paying, the buyer returns to `/dashboard?paid=1` (couples are
  forwarded to theirs with the flag intact). `PaymentSuccessBanner` reports
  the account's **real** state rather than assuming success: the webhook
  usually lands a beat after the redirect, so until it does the banner says
  "activating" and re-checks the server a few times.
- Env: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `POLAR_SERVER`
  (`sandbox` while testing), `POLAR_PRODUCT_{ONE_EVENT,SOLO_*,PRO_*}`.

**Payhip** stays wired as the fallback: One Event (€39, key `6VaFA`) via the
`Payhip.Checkout.open` overlay, webhook at `/api/billing/webhook` with
form-encoded `security_token` verification and email-based user matching.
LemonSqueezy code paths are present but dormant.

### Marketing / public
- Locale-routed marketing pages `/[locale]/...`:
  `/`, `/pricing`, `/for-photographers`, `/for-couples`,
  `/get-started`, `/(auth)/login|signup|signup/verify`,
  `/forgot-password`, `/reset-password`, `/gallery/[slug]`, `/upload/[slug]`
- **Confetti Explainer** — animated portrait-mobile + landscape-desktop story
  on the homepage, using `GalleryAppShell` mock-app screens for the Gallery
  and EventTypes scenes
- **Content pages** (static, both languages, written by hand):
  `/dogadjaji/{vjencanje,rodjendan,krstenje,firmska-proslava,konferencija}`,
  `/kako-funkcionise`, `/pitanja`, `/privatnost-i-sigurnost`. The last one is
  the honest account of what "private gallery" means here — unlisted link,
  optional PIN, expiring media URLs, and the part usually left out: without a
  PIN, whoever holds the link is in. The rules these follow are in §6.

### SEO

- `src/lib/seo.ts` is the only place that builds page metadata.
  `publicMetadata({ locale, path, title, description })` returns the canonical
  URL plus `hreflang` alternates for every language — the site publishes each
  marketing page twice (`/en/...`, `/bs/...`), so without those two copies
  compete with each other. `x-default` points at the English copy, not at `/`,
  because `/` only redirects by `Accept-Language`.
- `privateMetadata()` is the counterpart, and **everything private must use
  it**: dashboards, admin, `/gallery/[slug]`, `/upload/[slug]`, auth screens.
  Those pages carry real people's photographs. `robots.ts` disallows the paths
  too, but a disallowed URL can still be listed if someone links to it — only
  `noindex` keeps it out.
- `robots.ts` and `sitemap.ts` are generated; the sitemap lists marketing
  routes only, each with its language alternates.
- `opengraph-image.tsx` draws the share card with `ImageResponse`, in plain
  Latin text so it renders in the default font everywhere. This is what shows
  when a link is pasted into WhatsApp or Viber, which is how the product
  mostly travels in BiH.
- Titles and descriptions live in `Dict.seo.*` (EN + BS), so search snippets
  are translated like everything else.
- The root `<html lang>` is `"en"` because both languages nest under one root
  layout; `[locale]/layout.tsx` marks the subtree with `<div lang={locale}
  className="contents">`, which is what a screen reader actually reads.

### Vercel deployment protection — a trap worth knowing

The project had **Vercel Authentication** (`ssoProtection`) set to
`all_except_custom_domains`. `event-gallery-app-rho.vercel.app` is a
Vercel-assigned domain, not a custom one, so the whole production site was
behind Vercel's login: the edge answered **403** before any request reached a
function. It looked fine in the owner's browser, which carries the Vercel SSO
cookie — but no guest could open an upload or gallery link, and every Polar
webhook delivery was rejected at the edge, which made a run of app-level
"fixes" look ineffective.

Now set to `preview`: previews stay private, production is public. If webhooks
or guest links ever 403 again with nothing in the runtime logs, check this
setting first — a request blocked at the edge never reaches the code, so no
amount of application logging will show it.

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
| Photographer | Solo (39 KM/mo yearly = 468 KM, or 49 KM monthly) or Pro (79 KM/mo yearly = 948 KM, or 99 KM monthly) | Subscription | Photographers managing multiple client events |
| Couple / event host | One Event | 79 KM one-time | One meaningful life event |

**Every price comes from `src/lib/pricing.ts`.** Marketing pages, the dashboard
plan chooser and the Polar catalogue have to agree, so nothing else writes a
number down: `marketing.ts` derives its cards from that table, the yearly total
and the "save 20%" claim are computed rather than typed, and `pricing.test.ts`
fails if a card drifts from the table. Changing a price means editing that file
**and** the amount in Polar.

**Solo and Pro differ in exactly two things** — `SOLO_/PRO_ACTIVE_EVENT_LIMIT`
and `SOLO_/PRO_STORAGE_LIMIT_BYTES`. Nothing else is plan-gated: guest video is
a per-event setting available on every plan, and the homepage spotlight is an
opt-in profile toggle for any photographer. Feature lists say "Everything in
Solo" for Pro rather than inventing a difference. Earlier copy advertised a
cold archive tier and per-plan analytics; neither exists, and both were
removed.

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

Everything numbered in earlier revisions of this file (bilingual inner forms,
QR-editor undo/redo + drafts + templates + mobile, `.env.example`, function
timeouts, PIN hashing, upload-confirm auth, admin manual activation, video
thumbnails) is **done**. What is genuinely left:

### Blocking launch — owner action, not code
1. **Run pending Supabase migrations** in the SQL editor if not already done:
   `add_billing_columns_to_users.sql`, `add_preferred_locale_to_users.sql`,
   `add_upload_session_id_to_media.sql`. The billing one is not optional —
   without it every payment webhook and the admin "mark as paid" action fail
   silently and paying customers stay on the free trial.
2. **Polar:** set `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` and
   `POLAR_PRODUCT_ONE_EVENT` in Vercel, and register the webhook endpoint
   `<APP_URL>/api/billing/polar/webhook` in Polar (subscribe at minimum to
   `order.paid`, `order.refunded`, `subscription.active`,
   `subscription.canceled`, `subscription.revoked`). Test with
   `POLAR_SERVER=sandbox` first. Still to create in Polar: the Solo/Pro
   subscription products → `POLAR_PRODUCT_{SOLO,PRO}_{MONTHLY,YEARLY}`.
   Also confirm Bosnia and Herzegovina is on Polar's supported-payout-country
   list — that was never verified from here.
   Payhip remains the fallback (the €39 One Event product works); its Solo/Pro
   products were never created either, and its webhook verification assumes a
   form-encoded `security_token` while the docs describe a newer
   JSON+signature scheme — see `src/app/api/billing/webhook/route.ts`.
3. **Supabase free → Pro** before any real traffic (500 MB DB / 2 GB bandwidth
   is spent quickly by image previews).
4. **Legal:** `src/lib/legal.ts` is a reviewed-by-nobody draft. Fill every
   `[bracketed]` placeholder (entity, address, contact email, governing law),
   have a lawyer read it, then delete the `draftNotice` field from each doc so
   the amber banner disappears.
5. **Confirm `APP_SECRET`** in Vercel is a strong random value (the app refuses
   to boot in production without it, but not without a *good* one).

### Needs eyes on a real device (cannot be checked from CI)
6. Fabric QR card editor, the Three.js hero loop in the footer CTA, video
   poster extraction on a real upload, and the gallery viewer on iOS Safari.

### Code work still open
7. **Real testimonials.** The fabricated ones were removed from every page;
   `marketing-testimonials.tsx` + its data stay in tree so the section can be
   restored once real quotes exist.
8. **Sentry (or similar).** `src/instrumentation.ts` already implements
   `onRequestError` and logs structured context — forwarding it needs an
   account + DSN.
9. **Video duration.** Poster frames are extracted client-side; `duration` is
   not plumbed through and is not displayed anywhere yet.
10. **Streaming ZIP.** `/api/media/download-batch` assembles the archive in
    memory (every original buffered, plus the finished ZIP), so it is capped at
    300 MB per request and tells the user to download in batches above that.
    A real wedding gallery exceeds that. The fix is streaming from R2 into a
    streamed ZIP response, or moving the job off the request path.
11. Email notifications (post-upload, expiry).
12. Physical print product shop (BiH market).

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

### Content pages (the SEO ones)
`/dogadjaji/[tip]`, `/kako-funkcionise`, `/pitanja`,
`/privatnost-i-sigurnost` all read from `Dict.content` and share
`src/components/content-page.tsx`. Three rules, in order of how much damage
breaking them does:

1. **No city variants, no generated matrix.** Five "wedding gallery in
   Sarajevo / Mostar / Tuzla" pages differing by a place name are doorway
   pages; Google has a name for them and a penalty to match. Five
   hand-written pages that each say something different is the whole point.
2. **Slugs are ASCII**, diacritics transliterated the way people type them
   (`vjencanje`, `rodjendan`), and **identical in both languages** — that is
   what makes the hreflang pair valid.
3. **`sitemap.test.ts` must keep passing.** It asserts no `/gallery`,
   `/upload`, `/dashboard` or `/admin` path is ever listed. The sitemap is a
   request to crawl, and those routes hold people's photographs.

Adding a page means adding it to `Dict.content` in both `en.ts` and `bs.ts`,
to `PUBLIC_PATHS` in `sitemap.ts`, and to `footerLinks` so it is not an
orphan. Adding an event type means only the dict — the route and the sitemap
both derive from that list.

---

## 7. WHAT NOT TO TOUCH

Stable + correct; refactor only if a task explicitly requires it.

- `src/lib/security.ts` — salted **scrypt** PIN hashing (with a backward-
  compatible path for legacy SHA-256 hashes), gallery cookie signing, IP
  hashing, and the expiring HMAC upload-confirm grant.
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
│   │   ├── privacy, terms              # legal (DRAFT)
│   │   ├── dogadjaji/[tip]             # ── SEO content pages (§6) ──
│   │   ├── kako-funkcionise            #    hand-written, static,
│   │   ├── pitanja                     #    bilingual, no city variants
│   │   ├── privatnost-i-sigurnost      #    how private a gallery really is
│   │   ├── gallery/[slug], upload/[slug]
│   │   └── page.tsx                    # locale-aware landing (ISR 10m)
│   ├── page.tsx                        # English landing
│   ├── layout.tsx
│   ├── globals.css                     # Tokens + utility classes
│   ├── robots.ts, sitemap.ts           # generated (+ sitemap.test.ts)
│   ├── opengraph-image.tsx             # share card via ImageResponse
│   ├── error.tsx, global-error.tsx, not-found.tsx   # Branded fallbacks
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
│       ├── uploads/confirm/route.ts      # signed grant + expiry
│       ├── media/[id]/{toggle-hidden,delete,permanent-delete,restore,
│       │               download,section}/route.ts
│       ├── media/download-batch/route.ts # ZIP
│       ├── qr-card/pdf/route.ts          # editor → PDF wrapper
│       ├── billing/{checkout, webhook, polar/webhook}/route.ts
│       └── internal/{process-media, purge-deleted-media}/route.ts
│
├── lib/
│   ├── types.ts, constants.ts, env.ts, utils.ts
│   ├── events.ts                    # ~1.5k LoC of event + media logic
│   ├── actions.ts                   # All Server Actions
│   ├── media.ts                     # Upload grants + thumbnails
│   ├── storage.ts, security.ts, rate-limit.ts, upload-validation.ts
│   ├── auth.ts, account.ts, marketing.ts
│   ├── seo.ts                       # publicMetadata / privateMetadata
│   ├── pricing.ts                   # the only place a price is written down
│   ├── billing.ts                   # Polar + Payhip + LemonSqueezy helpers
│   ├── billing-status.ts            # plan/status wording, shared w/ client
│   ├── qr-posters.ts                # 4 SVG poster templates
│   ├── qr-posters-render.ts         # Resvg + pdf-lib pipeline
│   ├── qr-posters-fonts.ts          # TTF paths for Resvg
│   ├── qr-card-editor/presets.ts    # 10 card templates (+ presets.test.ts)
│   ├── legal.ts                     # Privacy + Terms content (EN/BS, DRAFT)
│   └── i18n/
│       ├── index.ts                 # Dict, getDictionary, t, localePrefix
│       ├── en.ts, bs.ts             # Translations
│       └── preference.ts            # redirectIfPreferredLocale
│
├── middleware.ts                    # Supabase session refresh
├── instrumentation.ts               # onRequestError → structured logs
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
    ├── content-page.tsx             # Breadcrumbs/CTA/shell for §6 pages
    ├── explainer/                   # Stage/Sprite scenes + lazy wrapper
    ├── hero-animation/              # Three.js QR→camera→wordmark loop (lazy)
    ├── legal-doc-view.tsx           # Renders a LegalDoc
    ├── marketing-testimonials.tsx   # ⚠ fabricated data — render removed
    └── marketing-trust-strip.tsx
```

---

## 9. RECENT SESSION LOG

Newest first — useful for picking back up.

- `ccf43c6` — Copy that did not match the code. "Prvi događaj je besplatan" was
  on all sixteen content pages while the trial is 7 days **or** 20 photos;
  `TRIAL_EVENT_LIMIT` was defined and never read, so the "1 event" claim went
  with it. The homepage's "100%" privacy stat contradicted the FAQ two pages
  over and is now "0 public galleries". `pricingUi.trialNote` was typed and
  never rendered — it is now the one place this is written down, and the two
  strings that bypassed i18n read from it.
- `d26aac0` — **The One Event product was being given away.** The trial check
  *and* the storage quota on the guest-upload route both sat inside
  `if (accountType === "photographer")`, so a couple's guests were subject to
  neither: sign up free, print the QR, collect photos up to 100 GB, for ever.
  Removing the condition is the whole fix — `computeTrialState` already returns
  "none" for a paid account, so paying customers are unaffected.
- `3fd13c8` — **Any account could make itself an admin.** The UPDATE policy on
  `public.users` had no `WITH CHECK`, and Postgres then reuses `USING`, which
  constrained only `id`. With a table-wide UPDATE grant and the public anon key,
  `PATCH /rest/v1/users?id=eq.<own uid> {"role":"admin"}` worked. Proven against
  the live database, then fixed with a column-scoped grant (the twelve profile
  fields the settings form writes). Every privileged write already went through
  the service role, so nothing the app does was narrowed.

- `3be508b` — Eight hand-written content pages in both languages: five event
  types under `/dogadjaji/[tip]`, plus `/kako-funkcionise`, `/pitanja` and
  `/privatnost-i-sigurnost`. All static; sitemap now 30 URLs and derives its
  event-type entries from the same dict list the routes do. `sitemap.test.ts`
  guards the one thing that must never happen — a `/gallery` or `/upload`
  path appearing in the crawl invitation. See §6 for the rules these follow.
- `35755b7` — Signed media URLs rounded to a 15-minute signing window, so a
  gallery photo is cacheable instead of re-downloaded on every page view.
- `adec7cb` — **Guest photos were on a permanent public R2 URL** —
  unsigned, unexpiring, unrevokable — while the upload page promised guests
  the opposite. Fixed by clearing `R2_PUBLIC_BASE_URL` (the code already
  falls back to signed URLs everywhere) and disabling the r2.dev domain.
- `b1e7350` — Bosnian is the published language: `primaryLocale = "bs"` drives
  `x-default` and the `Accept-Language` fallback, while `defaultLocale` stays
  `"en"` for unprefixed routing. Landing page became ISR (10m).
- `699f217` — SEO foundation: `src/lib/seo.ts` (`publicMetadata` /
  `privateMetadata`), generated `robots.ts` + `sitemap.ts`, `X-Robots-Tag`
  headers on every private path, translated titles in `Dict.seo`.
- `76fe0e0` — `src/lib/pricing.ts` is now the only place a price is written
  down, in the currency the active provider actually charges.
- `61c2a55` — Admin panel stopped labelling couples with a photographer tier.
- _(earlier this session)_ — Polar checkout + signature-verified webhook, **proven end
  to end in sandbox**: click → hosted checkout → `order.created` +
  `order.paid` → `users.subscription_status = 'active'`, `provider = 'polar'`,
  order id stored. The account was matched by `metadata.userId`, not by email.
  Getting there also fixed three unrelated faults that each looked like the
  payment bug: Vercel Authentication blocking the whole site at the edge, the
  four billing columns never having been created, and the SDK's signature
  helper being unusable against Standard Webhooks endpoints.
  Checkout route prefers Polar and falls back to Payhip; the couple checkout
  button is provider-aware and fully bilingual (incl. the One Event feature
  list); One Event shows 79,00 KM when Polar is live.
  Refund verified the same way: `order.refunded` → 200 → `canceled`.
  **Vercel is currently pointed at the Polar sandbox** — `POLAR_SERVER=sandbox`,
  sandbox token, sandbox webhook secret, and sandbox ids for all five products
  (each env var carries a comment saying so). The sandbox org `confetti` holds
  One Event plus Solo/Pro monthly and yearly, all in BAM.
  Production so far has only One Event, `18348a4c-3bec-4da7-8792-4b7dcbdf4f42`,
  and its webhook endpoint is disabled in Polar after the run of 403s. Going
  live means creating the four subscription products there, switching every
  `POLAR_*` var back together, and re-enabling that endpoint.
- `c76ccb1` — Rule-of-React repairs; lint clean.
- `a1ee86a` — ZIP download memory ceiling (no more OOM on big galleries).
- `c87ef08` — Presigned URLs were expiring mid-upload and mid-gallery; editor
  history/draft memory bounded.
- `ee86269` — 7 event-type card templates (10 total), rect/circle/line
  primitives in the editor, `presets.test.ts` geometry guard; dropped the
  ignored `eventSlug` option on `resolveAccountRedirect` + the redundant
  per-login events query it forced.
- `aaf4737` — Client-extracted video poster thumbnails (presigned thumb slot,
  best-effort `<video>`+`<canvas>` capture, grid renders the poster).
- `a0e7d41` — Branded error/404 pages + `onRequestError` logging.
- `063e6b4` — Pre-launch hardening: scrypt PINs (legacy-compatible), expiring
  upload grants + event/source derived from the signed key, fabricated
  testimonials removed, `.env.example`, 60s media-route timeouts.
- `e07c39c` — Draft Privacy + Terms pages (EN/BS) wired into the footer.
- `4731e39` — Three.js hero loop in the footer CTA (lazy, transparent).
- `c379214` — Lazy-load the explainer to shrink first-load JS.
- `cddf88f` — Confetti Explainer Mobile remix ported from Claude Design.
- `98bfbc0` — Landing photo mosaic band.
- `3188c38` — Remaining dashboard forms translated (EN/BS).
- `90b26a8` — Bilingual create-event form + illustrated banner.
- `2492c73` / `cfe5a8c` — Gallery UX pass: warm copy, bilingual viewer, photo
  tiles, mobile grid; viewer portalled to `<body>` so it fills the screen.
- `1dd9714` — QR editor: undo/redo, centre snapping, draft autosave, mobile.

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
