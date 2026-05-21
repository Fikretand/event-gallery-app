# CLAUDE.md — Confetti Event Gallery App

---

## 1. PROJECT OVERVIEW

**Confetti** is a private event gallery SaaS. The core value proposition:

- An event organizer (photographer or couple) creates an event and gets two links: a **guest upload URL** (shareable via QR code) and a **private gallery URL** (PIN-protected).
- Guests upload photos/videos from their phones via QR code — no app, no account required.
- The event owner reviews uploads, moderates them, and delivers the curated gallery to clients/family.

**Current state:** Functional MVP. Auth, event CRUD, guest upload, gallery PIN, media moderation, QR code, sections, archive, and dashboard are all implemented. No payment integration exists. Copy and visuals are wedding-centric (needs broadening). No admin panel. No i18n.

**Brand name:** Confetti (used in `src/lib/env.ts` as `appName`).

**Architecture:**
- Next.js 16 App Router, React Server Components for all data-fetching pages
- Supabase for auth + PostgreSQL database
- Cloudflare R2 for object storage (accessed via AWS S3 SDK)
- Server Actions (`src/lib/actions.ts`) for all write operations
- `sharp` for server-side image thumbnail generation
- No client-side state management library — everything is server-rendered or simple React state

---

## 2. TECH STACK

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS v4 | ^4 |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | ^0.9.0 / ^2.99.1 |
| Object Storage | Cloudflare R2 via `@aws-sdk/client-s3` | ^3.1009.0 |
| Presigned URLs | `@aws-sdk/s3-request-presigner` | ^3.1009.0 |
| Image Processing | `sharp` | ^0.34.5 |
| QR Code | `qrcode` | ^1.5.4 |
| ZIP Download | `jszip` | ^3.10.1 |
| Testing | Vitest | ^4.1.0 |
| Linting | ESLint + `eslint-config-next` | ^9 / 16.1.6 |

**No UI component library** — all components are hand-built with Tailwind v4 inline styles.

**CSS design tokens** (defined in `src/app/globals.css`):
- `--color-paper`: `#f2eadf` (warm off-white)
- `--color-ink`: `#172033` (near-black)
- `--color-accent`: `#e27952` (warm orange)
- `--color-accent-soft`: `#f6d3c3`
- `--color-moss`: `#38584d` (deep green)
- Background: warm parchment gradient with subtle orange/green radial accents
- Font: Trebuchet MS / Avenir Next / Segoe UI (system stack, no Google Fonts)

---

## 3. CURRENT STATE

### Built and working
- **Auth flows**: signup (email confirmation), login, password reset, sign out — all via Supabase Auth + Server Actions
- **Event CRUD**: create, update, delete (permanent), list — with slug-based routing
- **Guest upload**: QR code, rate-limited upload sessions, PIN protection, file validation, R2 presigned URL upload
- **Photographer upload**: direct upload from dashboard with same R2 presign flow
- **Upload confirmation**: `POST /api/uploads/confirm` triggers media record creation + `sharp` thumbnail generation
- **Gallery**: PIN-protected public view, sectioned by `gallery_sections`, per-file hide/unhide
- **Media moderation**: hide, soft-delete, restore, permanent delete (all with activity log)
- **Gallery sections**: create, rename, delete sections; assign media to sections
- **Cover image**: set/clear cover per event
- **QR code**: auto-generated per event in dashboard, styled with brand colors
- **Event analytics**: media count, guest upload count, storage used, download count
- **Download**: individual file download (signed URL), batch ZIP via `jszip`
- **Archive system**: warm → cold storage transition, restore flow (see §8 — this is marked for removal)
- **Dashboard**: usage cards (live storage, archive storage, event count, plan), event list
- **Profile**: photographer public profile with avatar upload, social links, opt-in homepage listing
- **Pricing/marketing pages**: `/`, `/pricing`, `/for-photographers`, `/for-couples`
- **Rate limiting**: DB-backed with in-memory fallback
- **Internal cron routes**: `/api/internal/purge-deleted-media`, `/api/internal/transition-archives`, `/api/internal/process-media`

### Partially done / incomplete
- **Couple account type**: implemented in DB and logic, but dashboard redirects couple users directly to their single event page (no couple-specific dashboard)
- **Event types beyond weddings**: data model is generic (`title`, `client_name`, `event_date`) but all copy is wedding-specific
- **Media processing for video**: `processMediaRecord` marks videos as `ready` immediately without generating thumbnails — no duration extraction
- **`copyStoredObject`**: does full download-then-reupload instead of a server-side R2 copy (works but is inefficient for large files)
- **Middleware**: `src/proxy.ts` implements Supabase session refresh but is named `proxy.ts` not `middleware.ts` — **the file is never executed** as Next.js middleware

### Missing / not built
- Payment integration (Stripe/Whop/Paddle/LemonSqueezy)
- Admin panel (user/gallery/storage management)
- Bilingual support (Bosnian/English)
- Physical product ordering for BiH market
- Real testimonials (current ones in `src/lib/marketing.ts` are fabricated placeholders)
- Email notifications (post-upload, event expiry, etc.)
- Beta/free trial plan logic
- Vercel deployment config (no `vercel.json`, no env documentation)

---

## 4. BUSINESS CONTEXT

**Product:** Confetti — private event gallery platform with guest photo/video upload via QR code.

**Two customer types:**

| Type | Plan | Billing | Use case |
|---|---|---|---|
| Photographer | Solo (€19/mo annual, €24/mo monthly) or Pro (€39/mo annual, €49/mo monthly) | Subscription | Professional event/wedding photographers managing multiple client events |
| Event host / Couple | One-time (€39) | One-time | Any individual hosting a single meaningful life event |

**Expanded event scope (not weddings-only):** Birthdays, anniversaries, baptisms, graduations, corporate events, baby showers, retirement parties, quinceañeras, engagement parties. The data model already supports any event type — only the copy needs updating.

**Dual market strategy:**
- **BiH (Bosnia and Herzegovina):** Local language (Bosnian), affordable pricing, physical print products
- **Global:** English, premium SaaS positioning

**Photographer plan limits** (from `src/lib/constants.ts`):
- Solo: 5 active events, 100 GB live storage, 250 GB archive, 15 archived events
- Pro: 25 active events, 500 GB live storage, 1 TB archive, 50 archived events

**Couple plan limits:** 1 event, 30-day upload window, 90-day gallery access

---

## 5. PRIORITIES (in order)

1. **UI/UX redesign** — premium, emotional, mobile-first, minimal
2. **Remove all archive-related code** — entire warm/cold archive system to be deleted
3. **Production deployment on Vercel** — configure env vars, fix middleware
4. **Supabase migration** — free → paid plan before production load
5. **Payment integration** — evaluate Whop, Stripe, LemonSqueezy, Paddle
6. **Admin panel** — user/gallery/storage management
7. **Realistic pricing packages** — for photographers and couples
8. **Dual-market strategy** — BiH (local language, affordable, physical products) and Global (English, premium SaaS)
9. **Bilingual support** — Bosnian/English
10. **Physical products** — for BiH market
11. **Better copywriting** — expand beyond weddings across all event types
12. **Better visuals/images** — landing page hero and marketing sections
13. **Marketing strategy** — TikTok, Instagram, photographer partnerships
14. **Beta testing** — free trial plan with real photographers and couples

---

## 6. WHAT NOT TO TOUCH

These parts are stable and correct. Refactor only if a task explicitly requires it:

- **`src/lib/security.ts`** — PIN hashing with `timingSafeEqual`, gallery cookie signing, IP hashing. Correct implementation.
- **`src/lib/rate-limit.ts`** — DB-backed rate limiting with in-memory fallback. Solid pattern.
- **`src/lib/upload-validation.ts`** — File type, size, and count validation logic.
- **`src/lib/storage.ts`** — R2 client and all presigned URL helpers.
- **`src/lib/supabase/`** — All three Supabase clients (browser, server, admin).
- **`src/lib/utils.ts`** — `slugify`, `formatBytes`, `formatDate`, `cn`, `absoluteUrl`.
- **`src/lib/env.ts`** — Environment variable parsing and availability flags.
- **`src/components/upload-dropzone.tsx`** — The guest/photographer upload UI. Tested against the full presign → upload → confirm flow.
- **`src/components/media-grid.tsx`** — The gallery/dashboard media display with owner moderation controls.
- **Database schema** (inferred from queries) — Do not rename tables or columns without a migration.

---

## 7. DECISION-MAKING GUIDELINES

**Prefer simplicity over complexity.** This is MVP stage. No premature abstractions.

**Mobile-first always.** Every UI decision defaults to the phone experience first.

**When choosing between two approaches,** recommend both with a tradeoff explanation rather than silently picking one.

**Security flags — act immediately:**
- Never expose service role keys to the client
- Always validate ownership before any write operation (user_id check on events/media)
- Never trust client-supplied `eventId`, `mediaId` etc. without verifying ownership
- Flag any new unauthenticated API endpoint

**Supabase free tier limits to watch:**
- 500 MB database — will hit this quickly with `media_files` rows at scale
- 2 GB bandwidth — exceeded by any real traffic with image previews
- 50,000 monthly active users — fine for MVP
- No point-in-time recovery on free tier — data loss risk in production
- **Action: migrate to Supabase Pro before any real user traffic**

**R2 storage:** No egress fees. Appropriate choice. Keep it.

**Never use `!important` in CSS.** Never override Tailwind's design tokens via inline `style={}` unless for dynamic values (e.g., progress bar widths).

**Event types:** The data model is already generic. To support a new event type, only copy/marketing content needs changing — no DB schema changes.

---

## 8. IDENTIFIED ISSUES

### Critical security issues

1. **`/api/uploads/confirm` has no authentication** (`src/app/api/uploads/confirm/route.ts:1`).
   Any anonymous request can call this endpoint with an arbitrary `eventId` and `objectKey` to inject a fake media record into any event. This needs auth or at minimum a signed token from the upload grant.

2. **`src/proxy.ts` is never executed as middleware.** The file is named `proxy.ts` instead of `middleware.ts`. Next.js only auto-runs `src/middleware.ts`. Sessions are not refreshed on navigation, meaning Supabase auth cookies will silently expire in production. Fix: rename to `src/middleware.ts` and re-export `proxy` as `default`.

3. **`DEFAULT_SECRET = "confetti-dev-secret"` in `src/lib/security.ts:6`.** If `APP_SECRET` env var is missing in production, gallery access cookies are signed with a hardcoded secret that anyone can read from the source. Must ensure `APP_SECRET` is set in production.

4. **PIN hashing uses plain SHA-256** (`src/lib/security.ts:8`). SHA-256 is fast and GPU-crackable. A 4-digit PIN has only 10,000 combinations. Use bcrypt or argon2 for PIN hashing, or enforce minimum PIN length (8+ chars).

### Architecture issues

5. **Archive system is entangled everywhere** — `EventArchiveRecord` type in `src/lib/types.ts`, archive functions throughout `src/lib/events.ts` (~300 lines), archive UI in `src/app/dashboard/page.tsx` and `src/app/dashboard/events/[slug]/page.tsx`, internal cron route `src/app/api/internal/transition-archives/route.ts`, Server Action `archivePhotographerEventAction` and `restoreArchivedPhotographerEventAction` in `src/lib/actions.ts`. Priority 2 in the roadmap is to remove all of this.

6. **`copyStoredObject` downloads entire file to RAM before re-uploading** (`src/lib/storage.ts:133`). For large video files this will OOM a serverless function. Use R2's native CopyObject API or stream the response. (Only matters once archive restore is actually used.)

7. **In-memory rate limit buckets don't survive serverless cold starts.** The `isRateLimitedInMemory` fallback in `src/lib/rate-limit.ts` is per-process. On Vercel, each invocation may be a fresh process. The DB-backed path is the correct one — ensure Supabase is always reachable.

8. **`processMediaRecord` in `src/lib/media.ts:75` loads the entire image into memory via `getStoredObjectBuffer`.** For a 50 MB HEIC file this is fine; for large RAW files it could OOM. Acceptable for MVP.

### Dead code / to be removed

9. **All archive-related code** (per Priority 2):
   - `src/lib/types.ts`: `EventArchiveRecord`, `EventArchiveStatus`, `EventArchiveStorageTier`
   - `src/lib/events.ts`: `getEventArchive`, `listEventArchives`, `archiveEventBySlug`, `restoreArchivedEventBySlug`, `transitionWarmArchivesToCold`, `getArchiveLifecycleLabel`, `getArchiveStorageStatusLabel`, archive-related helpers
   - `src/lib/actions.ts`: `archivePhotographerEventAction`, `restoreArchivedPhotographerEventAction`
   - `src/app/api/internal/transition-archives/route.ts` — entire file
   - `src/app/dashboard/page.tsx`: archive storage card, archive map fetching
   - `src/app/dashboard/events/[slug]/page.tsx`: all `isWarmArchivedWorkspace` / `isColdArchivedWorkspace` branches
   - `src/lib/env.ts`: `r2ArchiveBucket`, `r2ColdArchiveBucket`, `hasR2Archive`, `hasR2ColdArchive`
   - `src/lib/constants.ts`: `SOLO_ARCHIVE_LIMIT_BYTES`, `PRO_ARCHIVE_LIMIT_BYTES`, `SOLO_ARCHIVED_EVENT_LIMIT`, `PRO_ARCHIVED_EVENT_LIMIT`

10. **`src/lib/account.ts:27` — `resolveAccountRedirect` is thin enough to inline.** Not harmful but adds indirection.

11. **`src/app/api/events/[slug]/qr/route.ts`** — check if this standalone QR route is still used or redundant with the dashboard's inline QR generation.

### Copy / product issues

12. **All marketing copy is wedding-centric.** "One Wedding plan", "for couples" page copy, hero text, FAQ answers all assume weddings. Must expand to all meaningful life events (birthdays, baptisms, graduations, etc.).

13. **Testimonials in `src/lib/marketing.ts:106` are fake/placeholder.** "Studio Nova Weddings", "Lejla & Harun", "Mira Events" — these are fabricated. Replace before any public launch.

14. **`MarketingTrustStrip` component** — verify content doesn't make false claims about user counts or endorsements.

15. **`/for-couples` page only mentions weddings** — need a generic "for event hosts" angle or multiple landing pages per event type.

### Minor

16. **`src/app/layout.tsx:4`** — `metadata.title` still says "for photographers" only; needs to reflect the full event platform scope.

17. **No `vercel.json`, no `.env.example`** — deployment docs are missing. Block before production.

18. **`src/app/(auth)/signup/page.tsx`** — `intent` query param defaults to `photographer`; couple signup path exists but discoverability is unclear.

---

## 9. RECOMMENDED NEXT STEPS

In the most logical order given the current codebase state:

### Step 1 — Fix critical security bugs (1–2 hours)
1. Rename `src/proxy.ts` → `src/middleware.ts`, export `proxy` as `default export`.
2. Add auth to `/api/uploads/confirm` — validate the `objectKey` against a signed upload grant, or require the session token.
3. Enforce `APP_SECRET` in production env — add a startup check that throws if missing.

### Step 2 — Remove archive system (2–4 hours)
Delete all archive-related code listed in §8 items 9. This simplifies every major file and removes ~500 lines of dead complexity before any UI redesign starts.

### Step 3 — Vercel deployment + env setup (1–2 hours)
1. Create `.env.example` documenting all required vars.
2. Add `vercel.json` with function timeout config (media processing may exceed 10s default).
3. Deploy to Vercel, verify all routes work.
4. Upgrade Supabase to Pro plan.

### Step 4 — Payment integration (evaluate first, then build)
Recommended evaluation order:
- **Stripe** — most flexible, best docs, more integration work
- **LemonSqueezy** — handles EU VAT, simpler for SaaS, good API
- **Paddle** — Merchant of Record (handles all tax globally), ideal for dual-market BiH + Global
- **Whop** — community/creator focus, probably not the right fit here

For dual-market strategy, **Paddle** is the strongest choice as it handles tax compliance in both BiH and global markets automatically.

### Step 5 — Expand event types in copy (1 day)
Update `src/lib/marketing.ts` and all page copy to be event-agnostic:
- Rename "One Wedding" plan to "One Event" (or keep "Moments" / "One Celebration")
- Update `/for-couples` to `/for-hosts` or add multiple event-type landing pages
- Update homepage hero and FAQ to mention birthdays, baptisms, graduations etc.

### Step 6 — UI/UX redesign (ongoing)
The visual foundation is already good (warm color palette, glass-morphism panels, mobile-responsive grid). The main gaps:
- No real hero image/video (currently a placeholder SVG `/confetti-hero.svg`)
- Pricing cards need clearer visual hierarchy between Solo/Pro/One-time
- Upload page could feel more celebratory/emotional for guests
- Dashboard needs better empty state and first-run onboarding

### Step 7 — Admin panel
Simple internal dashboard at `/admin` (protected by `role === "admin"` in the users table):
- View all users + account types
- View storage usage per account
- Manually adjust plan tier
- View total media count + storage across platform

### Step 8 — Bilingual support
Next.js `i18n` routing with `bs` (Bosnian) and `en` locale. Move all copy strings in `src/lib/marketing.ts` and page files to locale-specific files. Do not use a third-party i18n library at MVP stage — Next.js built-in routing + a simple `t()` helper is sufficient.

---

## File map (key files only)

```
src/
├── app/
│   ├── page.tsx                          # Landing page (marketing)
│   ├── layout.tsx                        # Root layout + metadata
│   ├── globals.css                       # Design tokens + utility classes
│   ├── pricing/page.tsx                  # Pricing page
│   ├── for-photographers/page.tsx        # Photographer landing page
│   ├── for-couples/page.tsx              # Couples/hosts landing page
│   ├── (auth)/login/page.tsx             # Login
│   ├── (auth)/signup/page.tsx            # Signup
│   ├── (auth)/signup/verify/page.tsx     # Email verification pending
│   ├── auth/confirm/route.ts             # Supabase email confirm redirect
│   ├── forgot-password/page.tsx          # Forgot password
│   ├── reset-password/page.tsx           # Password reset
│   ├── dashboard/page.tsx                # Photographer dashboard (event list + usage)
│   ├── dashboard/events/new/page.tsx     # Create event
│   ├── dashboard/events/[slug]/page.tsx  # Event detail + management
│   ├── dashboard/profile/page.tsx        # Photographer public profile settings
│   ├── upload/[slug]/page.tsx            # Public guest upload page
│   ├── gallery/[slug]/page.tsx           # Public gallery (PIN-protected)
│   └── api/
│       ├── events/[slug]/guest-upload-session/route.ts    # Starts guest upload → presigned URLs
│       ├── events/[slug]/photographer-upload-session/route.ts  # Starts photographer upload
│       ├── events/[slug]/media/route.ts                   # Fetch event media
│       ├── events/[slug]/cover/route.ts                   # Set/clear cover image
│       ├── events/[slug]/qr/route.ts                      # QR code endpoint
│       ├── uploads/confirm/route.ts                       # ⚠️ Post-upload confirmation (no auth)
│       ├── media/[id]/toggle-hidden/route.ts
│       ├── media/[id]/delete/route.ts
│       ├── media/[id]/permanent-delete/route.ts
│       ├── media/[id]/restore/route.ts
│       ├── media/[id]/download/route.ts
│       ├── media/[id]/section/route.ts
│       ├── media/download-batch/route.ts                  # ZIP batch download
│       └── internal/
│           ├── process-media/route.ts                     # Worker: thumbnail generation
│           ├── purge-deleted-media/route.ts               # Cron: hard-delete old soft-deletes
│           └── transition-archives/route.ts               # ⚠️ TO DELETE (archive system)
├── lib/
│   ├── types.ts           # All TypeScript types (DB record shapes)
│   ├── constants.ts       # Plan limits, file type allowlists, rate limit config
│   ├── env.ts             # Env var parsing + availability flags
│   ├── events.ts          # Core event + media business logic (~1,500 lines)
│   ├── actions.ts         # Next.js Server Actions (all user-triggered writes)
│   ├── media.ts           # Upload grant building + thumbnail processing
│   ├── storage.ts         # R2 client + all storage helpers
│   ├── security.ts        # PIN hashing, gallery cookie, IP hashing
│   ├── rate-limit.ts      # DB-backed rate limiting with in-memory fallback
│   ├── upload-validation.ts # File type/size/count validation
│   ├── auth.ts            # User profile helpers (getRequiredUser, getAccountTypeForUser)
│   ├── account.ts         # Account type normalization + redirect resolution
│   ├── marketing.ts       # All marketing copy (plans, benefits, FAQs, testimonials)
│   └── utils.ts           # cn, slugify, formatBytes, formatDate, absoluteUrl
├── proxy.ts               # ⚠️ Supabase session middleware — RENAME to middleware.ts
└── components/
    ├── ui/button.tsx, input.tsx, panel.tsx   # Primitive UI components
    ├── upload-dropzone.tsx                    # Guest + photographer upload UI
    ├── media-grid.tsx                         # Gallery/dashboard media grid
    ├── event-create-form.tsx                  # New event form
    ├── event-settings-form.tsx                # Edit event settings
    ├── event-lifecycle-panel.tsx              # Archive/restore/delete controls (TO DELETE)
    ├── gallery-sections-manager.tsx           # Section CRUD in dashboard
    ├── auth-form.tsx                          # Login/signup form
    ├── site-nav.tsx                           # Marketing nav
    ├── dashboard-header.tsx                   # Dashboard page header
    ├── dashboard-event-list.tsx               # Event list in dashboard
    ├── photographer-profile-form.tsx          # Public profile form
    ├── pricing-showcase.tsx                   # Pricing cards component
    ├── marketing-button-link.tsx              # CTA button with tone variants
    ├── marketing-testimonials.tsx             # Testimonials section (PLACEHOLDER DATA)
    ├── marketing-trust-strip.tsx              # Trust badges strip
    ├── setup-notice.tsx                       # Shown when env vars missing
    ├── forgot-password-form.tsx
    └── reset-password-form.tsx
```
