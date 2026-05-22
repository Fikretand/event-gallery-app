"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { env } from "@/lib/env";
import { MarketingButtonLink } from "@/components/marketing-button-link";
import type { Locale } from "@/lib/i18n/index";

// ─── Inline nav strings (avoids async dict in client component) ───────────────

const NAV = {
  en: {
    forPhotographers: "For photographers",
    forCouples: "For couples",
    pricing: "Pricing",
    logIn: "Log in",
    startFree: "Start free",
    switchLabel: "BS",
    switchTitle: "Prebaci na bosanski",
  },
  bs: {
    forPhotographers: "Za fotografe",
    forCouples: "Za parove",
    pricing: "Cijene",
    logIn: "Prijava",
    startFree: "Počni besplatno",
    switchLabel: "EN",
    switchTitle: "Switch to English",
  },
};

function extractLocale(pathname: string): Locale {
  if (pathname.startsWith("/bs")) return "bs";
  return "en";
}

/** Prepend locale prefix to a path (e.g. "/for-photographers" → "/en/for-photographers") */
function localePath(locale: Locale, path: string) {
  return `/${locale}${path}`;
}

/** Build the path to switch to the other locale */
function switchLocalePath(pathname: string, currentLocale: Locale): string {
  const other: Locale = currentLocale === "en" ? "bs" : "en";
  const withoutLocale = pathname.replace(/^\/(en|bs)/, "") || "";
  return `/${other}${withoutLocale}`;
}

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const locale = extractLocale(pathname);
  const nav = NAV[locale];
  const switchPath = switchLocalePath(pathname, locale);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-black/8 bg-[rgba(251,247,241,0.88)] backdrop-blur-xl shadow-[0_1px_24px_rgba(18,24,38,0.06)]"
          : "bg-transparent"
      }`}
    >
      <div className="shell flex items-center justify-between py-4">
        <Link
          href={localePath(locale, "/")}
          className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
        >
          {env.appName}
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link
            href={localePath(locale, "/for-photographers")}
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            {nav.forPhotographers}
          </Link>
          <Link
            href={localePath(locale, "/for-couples")}
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            {nav.forCouples}
          </Link>
          <Link
            href={localePath(locale, "/pricing")}
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            {nav.pricing}
          </Link>
        </nav>

        <nav className="flex items-center gap-2 text-sm font-medium">
          {/* Language switcher */}
          <Link
            href={switchPath}
            title={nav.switchTitle}
            className="rounded-full border border-black/12 bg-white/70 px-3 py-1.5 text-xs font-bold tracking-widest text-black/55 transition hover:bg-white hover:text-[var(--color-ink)]"
          >
            {nav.switchLabel}
          </Link>

          <Link
            href={localePath(locale, "/login")}
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            {nav.logIn}
          </Link>
          <MarketingButtonLink
            href={localePath(locale, "/signup?intent=photographer")}
            className="whitespace-nowrap shadow-[0_4px_16px_rgba(226,121,82,0.22)]"
          >
            {nav.startFree}
          </MarketingButtonLink>
        </nav>
      </div>
    </header>
  );
}
