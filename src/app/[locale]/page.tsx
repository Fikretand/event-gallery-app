import Link from "next/link";
import { redirect } from "next/navigation";

import { ConfettiExplainer } from "@/components/explainer/confetti-explainer";
import { MarketingButtonLink } from "@/components/marketing-button-link";
import { MarketingTestimonials } from "@/components/marketing-testimonials";
import { MarketingTrustStrip } from "@/components/marketing-trust-strip";
import { PricingShowcase } from "@/components/pricing-showcase";
import { Panel } from "@/components/ui/panel";
import { SiteNav } from "@/components/site-nav";
import { listPublicPhotographers } from "@/lib/events";
import { getDictionary, type Locale } from "@/lib/i18n/index";

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

const QR_CELLS = [
  1,1,1,0,1,1,1,1,
  1,0,1,0,0,0,1,0,
  1,1,1,0,1,1,1,0,
  0,0,0,1,0,0,0,1,
  1,1,0,0,1,1,0,0,
  0,1,1,1,0,0,1,1,
  1,1,1,0,1,0,1,0,
  0,0,0,1,1,1,1,0,
];

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

const FEATURE_TONES = [
  "bg-[linear-gradient(135deg,rgba(255,253,249,0.98),rgba(246,211,195,0.55))] border-[#edd5c5]",
  "bg-[linear-gradient(135deg,rgba(250,255,252,0.98),rgba(210,234,222,0.62))] border-[#c8e0d4]",
  "bg-[linear-gradient(135deg,rgba(255,254,251,0.98),rgba(242,234,223,0.75))] border-[#ddd4c6]",
];
const FEATURE_ICONS = [
  <svg key="f1" viewBox="0 0 22 22" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="4" width="16" height="15" rx="2.5" />
    <path d="M7 2v4M15 2v4M3 10h16" />
    <path d="M8 15l2 2 4-4" />
  </svg>,
  <svg key="f2" viewBox="0 0 22 22" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="2.5" y="2.5" width="7" height="7" rx="1.2" />
    <rect x="12.5" y="2.5" width="7" height="7" rx="1.2" />
    <rect x="2.5" y="12.5" width="7" height="7" rx="1.2" />
    <path d="M13 13h2v2h-2zM17 13h2v6h-2M13 17h4" />
  </svg>,
  <svg key="f3" viewBox="0 0 22 22" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M11 2.5l6.5 2.8v4.6c0 4.6-2.9 7.6-6.5 9.2C4.4 17.5 1.5 14.5 1.5 9.9V5.3L11 2.5Z" />
    <path d="M8 11.5l2 2L14 9" />
  </svg>,
];
const STEP_ICONS = [
  <svg key="s1" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M8 2.5v4M16 2.5v4M3 11h18" />
    <path d="M12 15v4M10 17h4" />
  </svg>,
  <svg key="s2" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
    <path d="M14 14h2v2h-2zM18 14h2v6h-2M14 18h4" />
  </svg>,
  <svg key="s3" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M7 14.5l3-3.5 3 3 3-4.5" />
    <circle cx="8" cy="9" r="1.3" fill="currentColor" stroke="none" />
  </svg>,
  <svg key="s4" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6l7-3z" />
    <path d="M9.5 12.2l1.8 1.8 3.7-4" />
  </svg>,
];

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ code?: string; next?: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.landing;
  const dm = dict.marketing;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  if (resolvedSearchParams?.code) {
    const redirectTarget = resolvedSearchParams.next
      ? `/auth/confirm?code=${encodeURIComponent(resolvedSearchParams.code)}&next=${encodeURIComponent(resolvedSearchParams.next)}`
      : `/auth/confirm?code=${encodeURIComponent(resolvedSearchParams.code)}`;
    redirect(redirectTarget);
  }

  const publicPhotographers = await listPublicPhotographers();
  const lp = (path: string) => `/${locale}${path}`;

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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <MarketingButtonLink
                href={lp("/get-started")}
                className="w-full px-8 shadow-[0_12px_32px_rgba(226,121,82,0.30)] sm:w-auto"
              >
                {d.ctaPrimary}
              </MarketingButtonLink>
              <MarketingButtonLink href={lp("/pricing")} tone="ghost" className="w-full bg-white/70 px-8 sm:w-auto">
                {d.ctaSecondary}
              </MarketingButtonLink>
            </div>
            <p className="mt-5 text-xs text-black/42">{d.heroCaveat}</p>
          </div>

          {/* iPhone mockup */}
          <div className="flex justify-center pb-10 lg:justify-end lg:pb-0">
            {/* Inner wrapper keeps float cards anchored to the phone on all viewports */}
            <div className="relative">
            <div className="float-card absolute -top-4 left-0 z-20 flex items-center gap-2 rounded-full border border-black/8 bg-white py-2 pl-2.5 pr-4 text-xs font-semibold text-[var(--color-ink)] shadow-[0_8px_28px_rgba(18,24,38,0.12)]">
              <span className="live-dot inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#dcf3e8] text-[10px]">📸</span>
              {d.phoneNotification}
            </div>

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

            <div className="float-card-delay absolute -right-3 top-24 z-20 rounded-[22px] border border-black/8 bg-white p-3.5 shadow-[0_16px_44px_rgba(18,24,38,0.14)]">
              <div className="grid grid-cols-8 gap-[2px]">
                {QR_CELLS.map((filled, i) => (
                  <div key={i} className={`h-[4.5px] w-[4.5px] rounded-[1px] ${filled ? "bg-[var(--color-ink)]" : ""}`} />
                ))}
              </div>
              <p className="mt-2 text-center text-[7.5px] font-bold uppercase tracking-[0.18em] text-black/38">
                {d.qrScanLabel}
              </p>
            </div>
            </div>{/* end inner relative wrapper */}
          </div>
        </div>
      </section>

      {/* ─── Stats strip ──────────────────────────────────────────── */}
      <section className="shell pb-8">
        <div className="grid grid-cols-3 divide-x divide-black/8 rounded-[28px] border border-black/8 bg-white/62 px-4 py-6 backdrop-blur sm:px-8 sm:py-7">
          {d.stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-[10px] leading-4 text-black/50 sm:text-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Feature strip ────────────────────────────────────────── */}
      <section className="shell pb-12 sm:pb-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {d.features.map((item, i) => (
            <Panel key={item.eyebrow} className={`mesh-card ${FEATURE_TONES[i]}`}>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/80 text-[var(--color-moss)] shadow-[0_8px_20px_rgba(18,24,38,0.07)]">
                {FEATURE_ICONS[i]}
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">{item.eyebrow}</p>
              <p className="mt-2 text-sm leading-6 text-black/65">{item.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ─── How it works — explainer ─────────────────────────────── */}
      <section className="shell py-12 sm:py-16">
        <div className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">
            {d.howItWorksEyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {d.howItWorksTitle}
          </h2>
        </div>

        {/* Dark frame makes the warm explainer canvas pop */}
        <div className="rounded-[34px] border border-[#22334c]/60 bg-[linear-gradient(160deg,#1e2d45,#172033)] p-2.5 shadow-[0_30px_80px_rgba(18,24,38,0.18)] sm:p-3.5">
          <ConfettiExplainer />
        </div>

        {/* Slim recap of the four steps */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {d.steps.map((step, i) => (
            <div key={step.n} className="flex items-start gap-3 rounded-2xl border border-black/8 bg-white/70 p-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-moss)]/10 text-[var(--color-moss)]">
                {STEP_ICONS[i]}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-black/55">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <MarketingTrustStrip locale={locale as Locale} />
      <MarketingTestimonials />

      {/* ─── Who it's for (router band) ───────────────────────────── */}
      <section className="shell py-12 sm:py-16">
        <div className="mb-7 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
            {d.whoForEyebrow}
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {d.whoForTitle}
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Photographers */}
          <Link
            href={lp("/for-photographers")}
            className="group relative overflow-hidden rounded-[28px] border border-[#cfe0d7] bg-[linear-gradient(160deg,rgba(245,251,248,0.98),rgba(222,238,231,0.85))] p-7 transition hover:shadow-[0_24px_60px_rgba(56,88,77,0.16)]"
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
            className="group relative overflow-hidden rounded-[28px] border border-[#ecd5c6] bg-[linear-gradient(160deg,rgba(255,253,250,0.98),rgba(248,229,217,0.7))] p-7 transition hover:shadow-[0_24px_60px_rgba(226,121,82,0.16)]"
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
              <Panel key={profile.id} className="bg-white/88">
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
        <Panel className="mesh-card border-[#d9cfc1] bg-[linear-gradient(160deg,#fffdfb,rgba(242,234,223,0.85))]">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">
                {d.faqEyebrow}
              </p>
              <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                {d.faqTitle}
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-7 text-black/62">{d.faqBody}</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <MarketingButtonLink href={lp("/get-started")} className="w-full sm:w-auto">
                  {d.faqCtaPrimary}
                </MarketingButtonLink>
                <MarketingButtonLink href={lp("/pricing")} tone="ghost" className="w-full sm:w-auto">
                  {d.faqCtaSecondary}
                </MarketingButtonLink>
              </div>
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
                  <p className="mt-3 pr-10 text-sm leading-6 text-black/65">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Panel>
      </section>

      {/* ─── Footer CTA ───────────────────────────────────────────── */}
      <section className="shell pb-20 pt-4">
        <div className="relative overflow-hidden rounded-[36px] border border-[var(--color-accent)]/18 bg-[radial-gradient(ellipse_at_top_left,rgba(226,121,82,0.22),transparent_44%),radial-gradient(ellipse_at_bottom_right,rgba(56,88,77,0.12),transparent_40%),linear-gradient(160deg,rgba(255,252,248,0.98),rgba(242,232,220,0.90))] px-8 py-16 text-center shadow-[0_30px_80px_rgba(18,24,38,0.08)]">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[var(--color-accent)]/8 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-[var(--color-moss)]/8 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/22 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              {d.footerCtaBadge}
            </span>
            <h2 className="font-display mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-5xl">
              {d.footerCtaTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-black/58">{d.footerCtaBody}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <MarketingButtonLink
                href={lp("/signup?intent=photographer")}
                className="w-full px-10 py-4 text-base shadow-[0_16px_40px_rgba(226,121,82,0.30)] sm:w-auto"
              >
                {d.footerCtaPrimary}
              </MarketingButtonLink>
              <MarketingButtonLink href={lp("/signup?intent=couple")} tone="ghost" className="w-full bg-white/75 px-10 py-4 text-base sm:w-auto">
                {d.footerCtaSecondary}
              </MarketingButtonLink>
            </div>
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
