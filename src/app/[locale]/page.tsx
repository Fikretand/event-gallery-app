import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";

import { AudienceCtas } from "@/components/audience-ctas";
import { ConfettiExplainer } from "@/components/explainer/confetti-explainer-lazy";
import { ConfettiHeroAnimation } from "@/components/hero-animation/confetti-hero-animation-lazy";
import { HowItWorks } from "@/components/how-it-works/how-it-works";
import { MarketingButtonLink } from "@/components/marketing-button-link";
import { PricingShowcase } from "@/components/pricing-showcase";
import { Panel } from "@/components/ui/panel";
import { SiteNav } from "@/components/site-nav";
import { listPublicPhotographers } from "@/lib/events";
import { daysWord, getDictionary, t, type Locale } from "@/lib/i18n/index";
import { PRO_ACTIVE_EVENT_LIMIT, SOLO_ACTIVE_EVENT_LIMIT, TRIAL_DURATION_DAYS, TRIAL_PHOTO_LIMIT } from "@/lib/constants";
import { ONE_EVENT_BAM, PLAN_PRICING_BAM, formatBam } from "@/lib/pricing";
import { publicMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

// ─── Static icons ─────────────────────────────────────────────────────────────

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.7 2.4 4.2 5.33 4.2 8.5S14.7 18.1 12 20.5c-2.7-2.4-4.2-5.33-4.2-8.5S9.3 5.9 12 3.5Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
      <path d="M13.3 20v-6.3h2.2l.33-2.58h-2.53V9.44c0-.75.2-1.26 1.28-1.26h1.37V5.87c-.24-.03-1.05-.1-2-.1-1.97 0-3.32 1.2-3.32 3.4v1.92H8.5v2.58h2.18V20h2.62Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m5.5 7.5 6.5 5 6.5-5" />
    </svg>
  );
}


const PHOTO_CELLS = [
  { col: 1, src: "/gallery-preview/p1.jpg" },
  { col: 1, src: "/gallery-preview/p2.jpg" },
  { col: 1, src: "/gallery-preview/p3.jpg" },
  { col: 2, src: "/gallery-preview/p4.jpg" },
  { col: 1, src: "/gallery-preview/p5.jpg" },
  { col: 1, src: "/gallery-preview/p6.jpg" },
  { col: 1, src: "/gallery-preview/p7.jpg" },
  { col: 2, src: "/gallery-preview/p8.jpg" },
];

// Editorial photo mosaic for the landing — real event photos from /public.
// `span` drives the bento rhythm; `grid-flow-dense` keeps it gap-free.
// 12 cells exactly (2×2 + 1×2 + 2×1 + four singles): three full rows at four
// columns, six at two. One more tile always left an orphan on the last row.
const GALLERY_MOSAIC: { src: string; span: string }[] = [
  { src: "/explainer/assets/gallery-ceremony-1.webp", span: "col-span-2 row-span-2" },
  { src: "/explainer/assets/party-2.webp", span: "" },
  { src: "/explainer/assets/gallery-cake-1.webp", span: "" },
  { src: "/explainer/assets/gallery-toasts-1.webp", span: "row-span-2" },
  { src: "/explainer/assets/generic-1.webp", span: "" },
  { src: "/explainer/assets/gallery-reception-1.webp", span: "col-span-2" },
  { src: "/explainer/assets/party-4.webp", span: "" },
];

/**
 * The animated "Kako funkcioniše" explainer. Hidden for now at the owner's
 * request — `HowItWorks` (switcher + four short scenes) replaced it.
 * The component, its scenes and its WebP assets all stay in tree; flip this
 * back to true to show it again. While false, its lazy chunk is never loaded.
 */
const SHOW_EXPLAINER = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.home;
  return publicMetadata({
    locale: locale as Locale,
    path: "/",
    title: seo.title,
    description: seo.description,
  });
}

/**
 * Regenerate at most once every ten minutes.
 *
 * Reading `searchParams` used to force this page to render from scratch on
 * every request — the slowest possible way to serve the one page most
 * visitors and every crawler see first. That hop (Supabase's `?code=` email
 * confirmation) now happens in middleware, so the page can be cached.
 *
 * The window is short because the photographer spotlight is live data; ten
 * minutes of staleness there is not worth a render per visit.
 */
export const revalidate = 600;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.landing;
  const dm = dict.marketing;
  // Every number in the FAQ comes from the same constants the product and
  // the checkout use, so an answer can never quote a stale price or limit.
  const faqFacts = {
    trialDays: TRIAL_DURATION_DAYS,
    trialDaysUnit: daysWord(TRIAL_DURATION_DAYS, locale as Locale),
    trialPhotos: TRIAL_PHOTO_LIMIT,
    oneEvent: formatBam(ONE_EVENT_BAM),
    soloMonthly: formatBam(PLAN_PRICING_BAM.solo.monthly),
    soloYearly: formatBam(PLAN_PRICING_BAM.solo.yearly),
    proMonthly: formatBam(PLAN_PRICING_BAM.pro.monthly),
    proYearly: formatBam(PLAN_PRICING_BAM.pro.yearly),
    soloEvents: SOLO_ACTIVE_EVENT_LIMIT,
    proEvents: PRO_ACTIVE_EVENT_LIMIT,
  };

  const publicPhotographers = await listPublicPhotographers();
  const lp = (path: string) => `/${locale}${path}`;
  // A real, scannable code on the mockup (it used to be a drawn pattern). It
  // leads somewhere useful for whoever scans it off the screen.
  const mockupQrSvg = await QRCode.toString(absoluteUrl(lp("/kako-funkcionise")), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#172033", light: "#ffffff" },
  });

  return (
    <main>
      <SiteNav />

      {/* ─── Hero ─────────────────────────────────────────────────── */}
      <section className="shell pb-10 pt-14 sm:pb-16 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-moss)]/22 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              {d.badgeText}
            </div>
            <h1 className="font-display mt-6 text-5xl font-semibold leading-[1.04] tracking-tight text-[var(--color-ink)] sm:text-6xl">
              {d.heroTitle}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-black/62 sm:text-lg sm:leading-8">
              {d.heroBody}
            </p>
            <AudienceCtas locale={locale as Locale} showPricingLink className="mt-8" />
            <p className="mt-5 text-xs text-black/42">{d.heroCaveat}</p>
          </div>

          {/* iPhone mockup */}
          <div className="flex justify-center pb-10 lg:justify-end lg:pb-0">
            {/* Inner wrapper keeps float cards anchored to the phone on all viewports */}
            <div className="relative">
            <div
              className="relative rounded-[54px] shadow-[0_52px_110px_rgba(18,24,38,0.32),0_24px_48px_rgba(18,24,38,0.18)]"
              style={{ width: "270px", height: "560px" }}
            >
              <svg width="270" height="560" viewBox="0 0 270 560" fill="none" xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute inset-0 z-10">
                <defs>
                  <mask id="iphoneBezelMask2">
                    <rect x="1" y="1" width="268" height="558" rx="54" fill="white" />
                    <rect x="11" y="11" width="248" height="538" rx="46" fill="black" />
                  </mask>
                  <linearGradient id="phoneBody2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c2c2c" />
                    <stop offset="100%" stopColor="#0e0e0e" />
                  </linearGradient>
                  <linearGradient id="phoneShine2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                    <stop offset="28%" stopColor="rgba(255,255,255,0.06)" />
                    <stop offset="72%" stopColor="rgba(255,255,255,0.02)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
                  </linearGradient>
                </defs>
                <rect x="1" y="1" width="268" height="558" rx="54" fill="url(#phoneBody2)" mask="url(#iphoneBezelMask2)" />
                <rect x="1" y="1" width="268" height="558" rx="54" fill="none" stroke="url(#phoneShine2)" strokeWidth="2.5" />
                <rect x="0.5" y="0.5" width="269" height="559" rx="54.5" fill="none" stroke="#070707" strokeWidth="1" />
                <rect x="11" y="11" width="248" height="538" rx="46" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
                <rect x="89" y="21" width="92" height="30" rx="15" fill="#030303" />
                <circle cx="163" cy="36" r="9.5" fill="#050505" />
                <circle cx="163" cy="36" r="6" fill="#020202" />
                <circle cx="163" cy="36" r="2.8" fill="#111" />
                <circle cx="165.5" cy="33.5" r="1.6" fill="rgba(255,255,255,0.16)" />
                <circle cx="103" cy="36" r="3.8" fill="#080808" />
                <rect x="112" y="33" width="18" height="6" rx="3" fill="#080808" />
                <rect x="-1" y="118" width="4.5" height="28" rx="2.25" fill="#1e1e1e" stroke="#0a0a0a" strokeWidth="0.5" />
                <rect x="-1" y="158" width="4.5" height="28" rx="2.25" fill="#1e1e1e" stroke="#0a0a0a" strokeWidth="0.5" />
                <rect x="-1" y="90" width="4.5" height="18" rx="2.25" fill="#1e1e1e" stroke="#0a0a0a" strokeWidth="0.5" />
                <rect x="266.5" y="136" width="4.5" height="50" rx="2.25" fill="#1e1e1e" stroke="#0a0a0a" strokeWidth="0.5" />
                <path d="M 58 1.8 Q 135 0 212 1.8" stroke="rgba(255,255,255,0.22)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <rect x="105" y="542" width="60" height="4.5" rx="2.25" fill="rgba(255,255,255,0.28)" />
              </svg>

              <div className="absolute overflow-hidden bg-[#f9f5ef]"
                style={{ top: "11px", left: "11px", right: "11px", bottom: "11px", borderRadius: "46px" }}>
                {/* Push notification: drops in from under the camera island like a real one */}
                <div
                  aria-hidden
                  className="phone-notif absolute left-2 right-2 top-[44px] z-30 rounded-[18px] border border-white/70 bg-white/80 p-2.5 shadow-[0_10px_30px_rgba(18,24,38,0.18)] backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--color-accent)] font-display text-[13px] font-semibold text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]">
                      C
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-black/55">Confetti</p>
                        <p className="text-[9px] text-black/40">{d.phoneNotificationTime}</p>
                      </div>
                      <p className="mt-0.5 text-[10.5px] font-medium leading-[13px] text-[var(--color-ink)]">
                        {d.phoneNotification}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 pl-9">
                    {PHOTO_CELLS.slice(0, 3).map((cell) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={cell.src} src={cell.src} alt="" className="h-7 w-7 rounded-[7px] object-cover ring-1 ring-black/5" />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-5" style={{ height: "52px", paddingTop: "13px" }}>
                  <span className="text-[11px] font-semibold text-[var(--color-ink)]">9:41</span>
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <circle cx="7" cy="9.5" r="1.3" fill="var(--color-ink)" />
                      <path d="M4.2 6.8a4 4 0 015.6 0" stroke="var(--color-ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                      <path d="M1.4 4a8 8 0 0111.2 0" stroke="var(--color-ink)" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                    </svg>
                    <div className="flex items-center gap-[1px]">
                      <div className="relative h-3.5 w-6 rounded-[3px] border border-[var(--color-ink)]/60">
                        <div className="absolute bottom-[2px] left-[2px] top-[2px] rounded-[1px] bg-[var(--color-ink)]" style={{ right: "4px" }} />
                      </div>
                      <div className="h-2 w-[2px] rounded-r-sm bg-[var(--color-ink)]/40" />
                    </div>
                  </div>
                </div>

                <div className="mx-3 overflow-hidden rounded-[24px] bg-white shadow-[0_4px_20px_rgba(18,24,38,0.09)]">
                  <div className="px-3.5 pb-2.5 pt-3">
                    <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-[var(--color-moss)]">
                      {dict.gallery.privateGallery}
                    </p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-tight text-[var(--color-ink)]">
                      {d.phoneMockupGalleryName}
                    </p>
                    <p className="mt-0.5 text-[9px] text-black/40">{d.phoneMockupDate}</p>
                    <div className="mt-1.5 flex gap-1.5">
                      <span className="rounded-full bg-[var(--color-paper)] px-2 py-0.5 text-[8px] font-medium text-black/50">
                        {d.phoneMockupGuests}
                      </span>
                      <span className="rounded-full bg-[#e6f2ee] px-2 py-0.5 text-[8px] font-medium text-[var(--color-moss)]">
                        {d.phoneMockupPinProtected}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-[2px] px-2 pb-3">
                    {PHOTO_CELLS.map((cell, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={cell.src}
                        alt=""
                        className={`rounded-[8px] object-cover w-full ${cell.col === 2 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 px-4">
                  {d.phoneMockupTabs.map((tab, i) => (
                    <span key={tab} className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${i === 0 ? "bg-[var(--color-ink)] text-white" : "bg-white/70 text-black/42"}`}>
                      {tab}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* The label wraps to the QR's own width, so the card hugs the code. */}
            <div className="float-card-delay absolute -right-6 top-[300px] z-20 flex w-[100px] flex-col items-center rounded-[18px] border border-black/8 bg-white p-3 pb-2.5 shadow-[0_16px_44px_rgba(18,24,38,0.16)] sm:-right-10">
              <div
                aria-hidden
                className="h-[76px] w-[76px] [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: mockupQrSvg }}
              />
              <p className="mt-2 text-balance text-center text-[8px] font-bold uppercase leading-[1.35] tracking-[0.14em] text-black/45">
                {d.qrScanLabel}
              </p>
            </div>
            </div>{/* end inner relative wrapper */}
          </div>
        </div>
      </section>

      {/* ─── Stats strip — quiet, chromeless row between the hero and how it works ── */}
      <section className="shell pb-10">
        <div className="grid grid-cols-3 divide-x divide-black/10 border-y border-black/6 py-6 sm:py-7">
          {d.stats.map((stat) => (
            <div key={stat.label} className="min-w-0 px-2 text-center">
              <p className="font-display text-2xl font-semibold leading-tight text-[var(--color-ink)] sm:text-3xl">
                {stat.value}
              </p>
              <p className="mx-auto mt-1 max-w-[9rem] text-[11px] leading-4 text-black/50 sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works — step switcher + animated scenes ─────────── */}
      <HowItWorks copy={d.howItWorks} qrSvg={mockupQrSvg} />

      {/* The old animated explainer, parked (see SHOW_EXPLAINER). */}
      {SHOW_EXPLAINER ? (
        <section className="shell pb-12 sm:pb-16">
          <div className="rounded-[34px] border border-[#22334c]/60 bg-[linear-gradient(160deg,#1e2d45,#172033)] p-2.5 shadow-[0_30px_80px_rgba(18,24,38,0.18)] sm:p-3.5">
            <ConfettiExplainer />
          </div>
        </section>
      ) : null}

      {/* ─── Photo mosaic band — real galleries break up the text-heavy flow ── */}
      <section className="shell pb-14 sm:pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
              {d.galleryBandEyebrow}
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {d.galleryBandTitle}
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/60 sm:text-base">{d.galleryBandBody}</p>
          </div>

          <div className="stagger-children grid auto-rows-[112px] grid-flow-row-dense grid-cols-2 gap-2.5 sm:auto-rows-[132px] sm:grid-cols-4 sm:gap-3 lg:auto-rows-[150px]">
            {GALLERY_MOSAIC.map((tile) => (
              <div
                key={tile.src}
                className={`lift-card overflow-hidden rounded-[18px] border border-black/5 bg-[var(--color-paper)] shadow-[0_10px_30px_rgba(18,24,38,0.06)] sm:rounded-[22px] ${tile.span}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tile.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.05]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who it's for (router band) — quiet full-bleed paper band, left header ── */}
      <section className="border-y border-black/6 bg-[var(--color-paper)]/45 py-12 sm:py-16">
        <div className="shell">
        <div className="mb-7 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
            {d.whoForEyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {d.whoForTitle}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.06fr_0.94fr]">
          {/* Photographers */}
          <Link
            href={lp("/for-photographers")}
            className="band-moss group relative overflow-hidden rounded-[28px] border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(56,88,77,0.16)]"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/85 text-[var(--color-moss)] shadow-[0_8px_20px_rgba(18,24,38,0.07)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
                <path d="M8.5 6.5l1.4-2.2h4.2l1.4 2.2" />
                <circle cx="12" cy="13" r="3.4" />
              </svg>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              {d.forPhotographersEyebrow}
            </p>
            <p className="mt-2 text-sm leading-6 text-black/68">{d.photographerCardBody}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
              {d.forPhotographersCtaPrimary}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>

          {/* Event hosts */}
          <Link
            href={lp("/for-couples")}
            className="band-warm group relative overflow-hidden rounded-[28px] border p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(226,121,82,0.16)]"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/85 text-[var(--color-accent)] shadow-[0_8px_20px_rgba(18,24,38,0.07)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 20.5s-7-4.3-7-9.4a3.6 3.6 0 016.999-1.2A3.6 3.6 0 0119 11.1c0 5.1-7 9.4-7 9.4z" />
              </svg>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
              {d.forCouplesEyebrow}
            </p>
            <p className="mt-2 text-sm leading-6 text-black/68">{d.coupleCardBody}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink)]">
              {d.forCouplesCtaPrimary}
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        </div>
        </div>
      </section>

      {/* ─── Pricing ──────────────────────────────────────────────── */}
      <section className="shell py-12 sm:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
              {d.pricingEyebrow}
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {d.pricingTitle}
            </h2>
          </div>
          <Link href={lp("/pricing")} className="text-sm font-semibold text-[var(--color-moss)] underline-offset-4 hover:underline">
            {d.pricingLink}
          </Link>
        </div>
        <div className="mt-8">
          <PricingShowcase />
        </div>
      </section>

      {/* ─── Photographer spotlight ───────────────────────────────── */}
      {publicPhotographers.length > 0 ? (
        <section className="shell py-12 sm:py-16">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
              {d.photographerSpotlightEyebrow}
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
              {d.photographerSpotlightTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black/58">
              {d.photographerSpotlightBody}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicPhotographers.map((profile) => (
              <Panel key={profile.id} className="lift-card bg-white/88">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-[18px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                    {profile.avatarPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarPreviewUrl} alt={profile.full_name ?? "Photographer"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-black/40">{dict.photographerPlaceholder}</div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">{profile.full_name ?? "Photographer"}</p>
                    {profile.city ? <p className="mt-0.5 text-sm text-black/52">{profile.city}</p> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.website_url ? <MarketingButtonLink href={profile.website_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Website for ${profile.full_name}`}><WebsiteIcon /></MarketingButtonLink> : null}
                  {profile.instagram_url ? <MarketingButtonLink href={profile.instagram_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Instagram for ${profile.full_name}`}><InstagramIcon /></MarketingButtonLink> : null}
                  {profile.facebook_url ? <MarketingButtonLink href={profile.facebook_url} tone="ghost" className="px-3 py-2 text-xs" external aria-label={`Facebook for ${profile.full_name}`}><FacebookIcon /></MarketingButtonLink> : null}
                  {profile.public_email_on_homepage && profile.email ? <MarketingButtonLink href={`mailto:${profile.email}`} tone="ghost" className="px-3 py-2 text-xs" aria-label={`Email ${profile.full_name}`}><MailIcon /></MarketingButtonLink> : null}
                </div>
              </Panel>
            ))}
          </div>
        </section>
      ) : null}

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      <section className="shell py-12 sm:py-16">
        <Panel className="mesh-card panel-quiet">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
                {d.faqEyebrow}
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                {d.faqTitle}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-black/62">{d.faqBody}</p>
              <AudienceCtas locale={locale as Locale} stacked showPricingLink className="mt-6 max-w-sm" />
            </div>
            <div className="space-y-3">
              {dm.faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group rounded-[20px] border border-black/8 bg-white/85 p-5"
                  open={index === 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--color-ink)] marker:content-none">
                    <span>{faq.question}</span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-[var(--color-moss)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 pr-10 text-sm leading-6 text-black/65">{t(faq.answer, faqFacts)}</p>
                </details>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      {/* ─── Footer CTA ───────────────────────────────────────────── */}
      <section className="shell pb-20 pt-4">
        <div className="hero-glow relative overflow-hidden rounded-[36px] border border-[var(--color-accent)]/18 px-8 py-16 text-center shadow-[0_30px_80px_rgba(18,24,38,0.08)]">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-accent)]/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-[var(--color-moss)]/8 blur-3xl" />
          <div className="relative">
            {/* 3D hero loop — QR → camera → Confetti wordmark (lazy, transparent) */}
            <div className="mx-auto -mt-2 mb-1 h-[clamp(200px,52vw,320px)] w-[clamp(200px,52vw,320px)]">
              <ConfettiHeroAnimation className="h-full w-full" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/22 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              {d.footerCtaBadge}
            </span>
            <h2 className="font-display mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-5xl">
              {d.footerCtaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-black/58">{d.footerCtaBody}</p>
            <AudienceCtas locale={locale as Locale} align="center" className="mt-8" />
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-black/8 bg-[var(--color-paper)]/40">
        <div className="shell flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-[var(--color-ink)]">Confetti</p>
            <p className="mt-1 text-xs text-black/45">{d.footerTagline}</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-black/50">
            {d.footerLinks.map((link) => (
              <Link key={link.href} href={lp(link.href)} className="hover:text-[var(--color-ink)]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
