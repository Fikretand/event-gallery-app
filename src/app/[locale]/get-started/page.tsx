import Link from "next/link";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { SiteNav } from "@/components/site-nav";
import { getDictionary, type Locale } from "@/lib/i18n/index";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CalendarHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M12 14.5c0 0-3-2-3-3.8a1.8 1.8 0 0 1 3-.8 1.8 1.8 0 0 1 3 .8c0 1.8-3 3.8-3 3.8z" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PHOTOGRAPHER_FEATURES = {
  en: ["Up to 25 active events", "QR guest uploads per event", "PIN-protected client delivery", "Moderation + gallery sections", "7-day free trial included"],
  bs: ["Do 25 aktivnih događaja", "QR prijenos gostiju po događaju", "Isporuka klijentu zaštićena PIN-om", "Moderacija + sekcije galerije", "7-dnevni besplatni trial uključen"],
};

const EVENT_FEATURES = {
  en: ["1 event, no subscription", "Unlimited guest photo uploads", "Private gallery with PIN", "30-day upload window", "90 days of gallery access"],
  bs: ["1 događaj, bez pretplate", "Neograničen prijenos gostiju", "Privatna galerija s PIN-om", "30 dana prozora za prijenos", "90 dana pristupa galeriji"],
};

export default async function GetStartedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.getStarted;
  const lp = (path: string) => `/${locale}${path}`;
  const lang = locale === "bs" ? "bs" : "en";

  return (
    <main className="min-h-screen">
      <SiteNav />

      <section className="shell py-14 sm:py-20">
        {/* Header */}
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-moss)]">
            {d.eyebrow}
          </p>
          <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.06] tracking-tight text-[var(--color-ink)] sm:text-5xl">
            {d.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-black/55 sm:text-lg">
            {d.body}
          </p>
        </div>

        {/* Two cards */}
        <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">

          {/* Photographer card */}
          <div className="group relative flex flex-col rounded-[32px] border border-[#cdddd4] bg-[linear-gradient(160deg,rgba(245,251,248,0.99),rgba(220,238,228,0.70))] p-8 shadow-[0_20px_60px_rgba(18,24,38,0.07)] transition-all duration-300 hover:shadow-[0_28px_80px_rgba(18,24,38,0.11)] hover:-translate-y-0.5">
            {/* Label chip */}
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-moss)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-moss)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-moss)]" />
              {d.photographerLabel}
            </span>

            {/* Icon */}
            <div className="mt-6 inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/80 text-[var(--color-moss)] shadow-[0_8px_24px_rgba(56,88,77,0.14)]">
              <CameraIcon />
            </div>

            <h2 className="font-display mt-5 text-2xl font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
              {d.photographerTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/62">
              {d.photographerBody}
            </p>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {PHOTOGRAPHER_FEATURES[lang].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-black/72">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-moss)]/12 text-[var(--color-moss)]">
                    <CheckIcon />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* Price */}
            <p className="mt-6 text-xs font-semibold text-[var(--color-moss)]">{d.photographerPlan}</p>

            {/* CTA */}
            <MarketingButtonLink
              href={lp("/signup?intent=photographer")}
              tone="ink"
              className="mt-6 w-full rounded-[18px] py-4"
            >
              {d.photographerCta}
            </MarketingButtonLink>
          </div>

          {/* Event host card */}
          <div className="group relative flex flex-col rounded-[32px] border border-[#e4d0c0] bg-[linear-gradient(160deg,rgba(255,253,250,0.99),rgba(248,228,215,0.72))] p-8 shadow-[0_20px_60px_rgba(18,24,38,0.07)] transition-all duration-300 hover:shadow-[0_28px_80px_rgba(18,24,38,0.11)] hover:-translate-y-0.5">
            {/* Label chip */}
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-accent)]/10 px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              {d.eventLabel}
            </span>

            {/* Icon */}
            <div className="mt-6 inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-white/80 text-[var(--color-accent)] shadow-[0_8px_24px_rgba(226,121,82,0.16)]">
              <CalendarHeartIcon />
            </div>

            <h2 className="font-display mt-5 text-2xl font-semibold leading-snug tracking-tight text-[var(--color-ink)]">
              {d.eventTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-black/62">
              {d.eventBody}
            </p>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {EVENT_FEATURES[lang].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-black/72">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
                    <CheckIcon />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            {/* Price */}
            <p className="mt-6 text-xs font-semibold text-[var(--color-accent)]">{d.eventPlan}</p>

            {/* CTA */}
            <MarketingButtonLink
              href={lp("/signup?intent=couple")}
              className="mt-6 w-full rounded-[18px] py-4 shadow-[0_12px_32px_rgba(226,121,82,0.28)]"
            >
              {d.eventCta}
            </MarketingButtonLink>
          </div>
        </div>

        {/* Log in link */}
        <p className="mt-10 text-center text-sm text-black/48">
          {d.alreadyHaveAccount}{" "}
          <Link href={lp("/login")} className="font-semibold text-[var(--color-ink)] underline-offset-4 hover:underline">
            {d.logIn}
          </Link>
        </p>
      </section>
    </main>
  );
}
