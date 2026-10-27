import type { Metadata } from "next";
import Link from "next/link";

import { MarketingButtonLink } from "@/components/marketing-button-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CheckIcon } from "@/components/ui/check-icon";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CalendarHeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <path d="M8 2v4M16 2v4M3 10h18" />
      <path d="M12 14.5c0 0-3-2-3-3.8a1.8 1.8 0 0 1 3-.8 1.8 1.8 0 0 1 3 .8c0 1.8-3 3.8-3 3.8z" fill="currentColor" stroke="none" opacity="0.7" />
    </svg>
  );
}

const PHOTOGRAPHER_FEATURES = {
  en: ["Up to 25 active events", "QR guest uploads per event", "PIN-protected client delivery", "Moderation + gallery sections", "Free trial: 7 days or 20 photos"],
  bs: ["Do 25 aktivnih događaja", "QR prijenos gostiju po događaju", "Isporuka klijentu zaštićena PIN-om", "Moderacija + sekcije galerije", "Besplatna proba: 7 dana ili 20 fotografija"],
};

const EVENT_FEATURES = {
  en: ["1 event, no subscription", "Unlimited guest photo uploads", "Private gallery with PIN", "30-day upload window", "90 days of gallery access"],
  bs: ["1 događaj, bez pretplate", "Neograničen prijenos gostiju", "Privatna galerija s PIN-om", "30 dana prozora za prijenos", "90 dana pristupa galeriji"],
};


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = getDictionary(locale as Locale).seo.getStarted;
  return publicMetadata({
    locale: locale as Locale,
    path: "/get-started",
    title: seo.title,
    description: seo.description,
  });
}

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

  const choices = [
    {
      key: "photographer",
      label: d.photographerLabel,
      title: d.photographerTitle,
      body: d.photographerBody,
      features: PHOTOGRAPHER_FEATURES[lang],
      plan: d.photographerPlan,
      href: lp("/signup?intent=photographer"),
      cta: d.photographerCta,
      icon: <CameraIcon />,
      primary: true,
    },
    {
      key: "event",
      label: d.eventLabel,
      title: d.eventTitle,
      body: d.eventBody,
      features: EVENT_FEATURES[lang],
      plan: d.eventPlan,
      href: lp("/signup?intent=couple"),
      cta: d.eventCta,
      icon: <CalendarHeartIcon />,
      primary: false,
    },
  ];

  return (
    <main>
      <SiteNav />

      <section className="shell pb-[var(--space-2xl)] pt-[var(--space-3xl)]">
        <div className="grid gap-y-[var(--space-md)] lg:grid-cols-12 lg:items-end lg:gap-x-[var(--gap-columns)]">
          <h1 className="max-w-[16ch] font-display text-[clamp(2.5rem,4vw+1rem,4.5rem)] font-semibold leading-[1.04] text-ink lg:col-span-7">
            {d.title}
          </h1>
          <p className="lead lg:col-span-5">{d.body}</p>
        </div>

      </section>

      {/* Two answers to the question, side by side, parted by a hairline. */}
      <section className="shell pb-[var(--space-3xl)]">
        <div className="grid border-t border-rule md:grid-cols-2 md:divide-x md:divide-rule">
          {choices.map((choice) => (
            <article key={choice.key} className="flex flex-col border-b border-rule py-[var(--space-xl)] md:border-b-0 md:px-[var(--space-xl)] md:first:pl-0 md:last:pr-0">
              <div className="flex items-center gap-3 text-moss">
                {choice.icon}
                <h2 className="title text-ink">{choice.label}</h2>
              </div>
              <p className="mt-[var(--space-md)] text-lg font-semibold leading-snug text-ink">{choice.title}</p>
              <p className="mt-[var(--space-sm)] max-w-[52ch] leading-relaxed text-ink-2">{choice.body}</p>
              <ul className="mt-[var(--space-lg)] space-y-2.5">
                {choice.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-ink">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-[var(--space-lg)] font-semibold text-moss">{choice.plan}</p>
              <MarketingButtonLink href={choice.href} tone={choice.primary ? "accent" : "ghost"} className="mt-[var(--space-lg)] w-full sm:w-auto sm:self-start">
                {choice.cta}
              </MarketingButtonLink>
            </article>
          ))}
        </div>

        <p className="mt-[var(--space-xl)] text-ink-2">
          {d.alreadyHaveAccount}{" "}
          <Link href={lp("/login")} className="link">
            {d.logIn}
          </Link>
        </p>
      </section>

      <SiteFooter locale={locale as Locale} />
    </main>
  );
}
