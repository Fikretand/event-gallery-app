import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";

import { AudienceCtas } from "@/components/audience-ctas";
import { ConfettiExplainer } from "@/components/explainer/confetti-explainer-lazy";
import { HeroDevice } from "@/components/hero-device/hero-device";
import { HowItWorks } from "@/components/how-it-works/how-it-works";
import { PricingShowcase } from "@/components/pricing-showcase";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { listPublicPhotographers } from "@/lib/events";
import { daysWord, getDictionary, t, type Locale } from "@/lib/i18n/index";
import { PRO_ACTIVE_EVENT_LIMIT, SOLO_ACTIVE_EVENT_LIMIT, TRIAL_DURATION_DAYS, TRIAL_PHOTO_LIMIT } from "@/lib/constants";
import { ONE_EVENT_BAM, PLAN_PRICING_BAM, formatBam } from "@/lib/pricing";
import { COUPLE_PURGE_GRACE_DAYS } from "@/lib/retention";
import { publicMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";
import { QR_COLORS } from "@/lib/brand-colors";

// ─── Static icons ─────────────────────────────────────────────────────────────

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.7 2.4 4.2 5.33 4.2 8.5S14.7 18.1 12 20.5c-2.7-2.4-4.2-5.33-4.2-8.5S9.3 5.9 12 3.5Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path d="M13.3 20v-6.3h2.2l.33-2.58h-2.53V9.44c0-.75.2-1.26 1.28-1.26h1.37V5.87c-.24-.03-1.05-.1-2-.1-1.97 0-3.32 1.2-3.32 3.4v1.92H8.5v2.58h2.18V20h2.62Z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m5.5 7.5 6.5 5 6.5-5" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-2 transition-transform duration-[var(--dur-short)] ease-[var(--ease-in-out)] group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

// Guest photos from real events, at the size a phone screen holds them. The
// rail runs past the container's edge, so the next one is always cut: there
// are more than fit, which is the point the section makes.
const GUEST_PHOTOS: { src: string; w: number; h: number }[] = [
  { src: "/explainer/assets/gallery-reception-1.webp", w: 667, h: 1000 },
  { src: "/explainer/assets/party-4.webp", w: 750, h: 1000 },
  { src: "/explainer/assets/generic-1.webp", w: 667, h: 1000 },
  { src: "/explainer/assets/gallery-reception-2.webp", w: 427, h: 640 },
  { src: "/explainer/assets/generic-3.webp", w: 667, h: 1000 },
  { src: "/explainer/assets/party-5.webp", w: 480, h: 640 },
  { src: "/explainer/assets/birthday-1.webp", w: 427, h: 640 },
  { src: "/explainer/assets/gallery-reception-3.webp", w: 427, h: 640 },
];

// The photo for each way in: a photographer's own frame for photographers,
// guests celebrating for hosts. `focus` is the object-position that keeps the
// faces in a 4:3 crop. Replace these with the owner's photos in /public/landing.
const ROUTE_PHOTOS = {
  photographer: { src: "/explainer/assets/upload-3.webp", w: 600, h: 600, focus: "50% 55%" },
  host: { src: "/explainer/assets/gallery-reception-3.webp", w: 427, h: 640, focus: "50% 35%" },
} as const;

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
    graceDays: COUPLE_PURGE_GRACE_DAYS,
  };

  const publicPhotographers = await listPublicPhotographers();
  const lp = (path: string) => `/${locale}${path}`;
  // A real, scannable code on the mockup. It leads somewhere useful for
  // whoever scans it off the screen.
  const mockupQrSvg = await QRCode.toString(absoluteUrl(lp("/kako-funkcionise")), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: QR_COLORS,
  });

  const routes = [
    {
      href: lp("/for-photographers"),
      title: d.forPhotographersEyebrow,
      body: d.photographerCardBody,
      cta: d.forPhotographersCtaPrimary,
      primary: true,
      photo: ROUTE_PHOTOS.photographer,
    },
    {
      href: lp("/for-couples"),
      title: d.forCouplesEyebrow,
      body: d.coupleCardBody,
      cta: d.forCouplesCtaPrimary,
      primary: false,
      photo: ROUTE_PHOTOS.host,
    },
  ];

  return (
    <main>
      <SiteNav />

      {/* ─── Hero. Wide: the words and the two ways in on six columns, the
           phone playing the guest → host → gallery story beside them. Phone:
           the words centred, then the phone, then the buttons, so the first
           screen says what this is before it asks for anything. ─── */}
      <section className="overflow-x-clip">
        <div className="shell grid min-h-[min(calc(100svh-var(--nav-height)),900px)] content-center gap-y-[var(--space-xl)] py-[var(--space-xl)] lg:grid-cols-12 lg:grid-rows-[auto_auto] lg:gap-x-[var(--gap-columns)] lg:gap-y-[var(--space-xl)]">
          <div className="settle text-center lg:col-span-6 lg:row-start-1 lg:self-end lg:text-left">
            <h1 className="mx-auto max-w-[16ch] font-display text-[clamp(2.5rem,4.4vw+1rem,4.75rem)] font-semibold leading-[1.03] tracking-[-0.025em] text-ink lg:mx-0">
              {d.heroTitle}
            </h1>
            <p className="lead mx-auto mt-[var(--space-lg)] max-w-[34ch] lg:mx-0 lg:max-w-[40ch]">{d.heroBody}</p>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-center">
            <HeroDevice copy={d.heroDevice} qrSvg={mockupQrSvg} align="start" />
          </div>

          <div className="lg:col-span-6 lg:row-start-2 lg:self-start">
            {/* Captions centred under the buttons on a phone, like the words above. */}
            <AudienceCtas locale={locale as Locale} className="[&_.meta]:text-center lg:[&_.meta]:text-left" />
            <p className="meta mt-[var(--space-lg)] text-center lg:text-left">{d.heroCaveat}</p>
          </div>
        </div>
      </section>

      {/* ─── Three figures the page already stated, parted by hairlines ── */}
      <section className="shell">
        {/* Three across at every width: on a phone a stacked list of three
            short figures read as filler between the hero and the steps. */}
        <dl className="grid grid-cols-3 divide-x divide-rule border-y border-rule">
          {d.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse items-center justify-end gap-2 px-2 py-[var(--space-lg)] text-center sm:items-start sm:px-[var(--space-xl)] sm:py-[var(--space-xl)] sm:text-left sm:first:pl-0">
              <dt className="text-sm leading-snug text-ink-2 sm:text-base">{stat.label}</dt>
              <dd className="num font-display text-[2rem] font-semibold leading-none tracking-[-0.02em] text-ink sm:text-[length:var(--text-display-s)]">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ─── How it works: four steps beside the stage that plays them ── */}
      <HowItWorks copy={d.howItWorks} qrSvg={mockupQrSvg} />

      {/* The old animated explainer, parked (see SHOW_EXPLAINER). */}
      {SHOW_EXPLAINER ? (
        <section className="shell pb-12 sm:pb-16">
          <div className="rounded-[var(--radius-card)] bg-ink p-3">
            <ConfettiExplainer />
          </div>
        </section>
      ) : null}

      {/* ─── The argument, then the photographs that make it ──────────── */}
      <section className="band overflow-x-clip">
        <div className="shell grid gap-y-[var(--space-lg)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
          <h2 className="section-head text-ink lg:col-span-8">
            {d.galleryBandTitle}
            <span className="display-s mt-[var(--space-sm)] block italic text-accent">{d.galleryBandTitleAccent}</span>
          </h2>
          <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2 lg:col-span-4 lg:col-start-9 lg:self-end">
            {d.galleryBandBody}
          </p>
        </div>
        <ul
          tabIndex={0}
          aria-label={d.galleryBandEyebrow}
          // The first photo lines up with the container's left edge; the
          // rail itself runs to the window's right edge.
          style={{ paddingLeft: "max(var(--gutter), calc((100% - var(--container)) / 2 + var(--gutter)))" }}
          className="mt-[var(--space-2xl)] flex snap-x snap-mandatory gap-[var(--space-md)] overflow-x-auto pb-[var(--space-md)] pr-[var(--gutter)] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          {GUEST_PHOTOS.map((photo) => (
            <li key={photo.src} className="w-[clamp(200px,22vw,300px)] shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt=""
                width={photo.w}
                height={photo.h}
                loading="lazy"
                decoding="async"
                className="aspect-[3/4] h-auto w-full rounded-[var(--radius-image)] bg-paper-3 object-cover"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Two ways in: a centred heading over two cards, each with a photo
           of who it is for and a button that says where it goes ───────── */}
      <section className="shell section">
        <h2 className="section-head mx-auto max-w-[18ch] text-center text-ink">{d.whoForTitle}</h2>
        <ul className="mt-[var(--space-2xl)] grid gap-[var(--space-lg)] md:grid-cols-2 md:gap-[var(--gap-columns)]">
          {routes.map((route) => (
            <li key={route.href} className="card flex flex-col overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={route.photo.src}
                alt=""
                width={route.photo.w}
                height={route.photo.h}
                loading="lazy"
                decoding="async"
                style={{ objectPosition: route.photo.focus }}
                className="aspect-[4/3] h-auto w-full bg-paper-3 object-cover"
              />
              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="font-display text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">{route.title}</h3>
                <p className="mt-[var(--space-sm)] max-w-[44ch] flex-1 leading-relaxed text-ink-2">{route.body}</p>
                <Link href={route.href} className={`btn ${route.primary ? "btn-primary" : "btn-ink"} mt-[var(--space-lg)] w-full sm:w-auto sm:self-start`}>
                  {route.cta}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Pricing, monthly or yearly ───────────────────────────────── */}
      <section id="pricing" className="shell section-s">
        <div className="mb-[var(--space-2xl)] flex flex-col items-center gap-[var(--space-md)] text-center">
          <h2 className="section-head max-w-[18ch] text-ink">{d.pricingTitle}</h2>
          <Link href={lp("/pricing")} className="link">
            {d.pricingLink}
          </Link>
        </div>
        <PricingShowcase />
      </section>

      {/* ─── Photographer spotlight (live data, opt-in) ───────────────── */}
      {publicPhotographers.length > 0 ? (
        <section className="shell section-s">
          <div className="grid gap-y-[var(--space-lg)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
            <div className="lg:col-span-4">
              <h2 className="section-head text-ink">{d.photographerSpotlightTitle}</h2>
              <p className="mt-[var(--space-md)] max-w-[40ch] text-ink-2">{d.photographerSpotlightBody}</p>
            </div>
            <ul className="border-t border-rule lg:col-span-8">
              {publicPhotographers.map((profile) => (
                <li key={profile.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-rule py-[var(--space-lg)]">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-paper-2">
                    {profile.avatarPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatarPreviewUrl} alt="" width={56} height={56} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-xl font-semibold text-ink-2">
                        {(profile.full_name ?? "?").slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{profile.full_name ?? dict.photographerPlaceholder}</p>
                    {profile.city ? <p className="meta mt-0.5">{profile.city}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    {profile.website_url ? (
                      <a href={profile.website_url} target="_blank" rel="noreferrer noopener" aria-label={`Website: ${profile.full_name}`} className="btn btn-sm btn-quiet min-w-11">
                        <WebsiteIcon />
                      </a>
                    ) : null}
                    {profile.instagram_url ? (
                      <a href={profile.instagram_url} target="_blank" rel="noreferrer noopener" aria-label={`Instagram: ${profile.full_name}`} className="btn btn-sm btn-quiet min-w-11">
                        <InstagramIcon />
                      </a>
                    ) : null}
                    {profile.facebook_url ? (
                      <a href={profile.facebook_url} target="_blank" rel="noreferrer noopener" aria-label={`Facebook: ${profile.full_name}`} className="btn btn-sm btn-quiet min-w-11">
                        <FacebookIcon />
                      </a>
                    ) : null}
                    {profile.public_email_on_homepage && profile.email ? (
                      <a href={`mailto:${profile.email}`} aria-label={`E-mail: ${profile.full_name}`} className="btn btn-sm btn-quiet min-w-11">
                        <MailIcon />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ─── Questions, as rows beside their heading ──────────────────── */}
      <section className="shell section">
        <div className="grid gap-y-[var(--space-xl)] lg:grid-cols-12 lg:gap-x-[var(--gap-columns)]">
          <div className="lg:col-span-4">
            <h2 className="section-head text-ink">{d.faqTitle}</h2>
            <p className="mt-[var(--space-md)] text-ink-2">{d.faqBody}</p>
          </div>
          <div className="border-t border-rule lg:col-span-8">
            {dm.faqs.map((faq, index) => (
              <details key={faq.question} className="group border-b border-rule" open={index === 0}>
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-[var(--space-lg)] text-[1.0625rem] font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <PlusIcon />
                </summary>
                <p className="max-w-[65ch] pb-[var(--space-lg)] pr-10 leading-relaxed text-ink-2">{t(faq.answer, faqFacts)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Close: the hero's two ways in, once more ─────────────────── */}
      <section className="bg-ink text-paper">
        <div className="shell grid gap-y-[var(--space-xl)] py-[var(--section-gap-s)] lg:grid-cols-12 lg:items-end lg:gap-x-[var(--gap-columns)]">
          <div className="lg:col-span-7">
            <h2 className="section-head text-paper">{d.footerCtaTitle}</h2>
            <p className="mt-[var(--space-lg)] max-w-[48ch] text-[1.0625rem] leading-relaxed text-paper-3">{d.footerCtaBody}</p>
          </div>
          <div className="lg:col-span-5">
            <AudienceCtas locale={locale as Locale} stacked onDark />
          </div>
        </div>
      </section>

      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
