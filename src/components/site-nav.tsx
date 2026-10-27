"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";

// ─── Inline nav strings (avoids async dict in client component) ───────────────

const NAV = {
  en: {
    forPhotographers: "For photographers",
    forCouples: "For couples",
    pricing: "Pricing",
    logIn: "Log in",
    startFree: "Start free",
    startShort: "Start",
    switchLabel: "BS",
    switchTitle: "Prebaci na bosanski",
    menuLabel: "Main",
    menu: "Menu",
    home: "Confetti, home",
  },
  bs: {
    forPhotographers: "Za fotografe",
    forCouples: "Za parove",
    pricing: "Cijene",
    logIn: "Prijava",
    startFree: "Počni besplatno",
    startShort: "Počni",
    switchLabel: "EN",
    switchTitle: "Switch to English",
    menuLabel: "Glavni meni",
    menu: "Meni",
    home: "Confetti, početna",
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

const linkClass =
  "inline-flex min-h-11 items-center rounded-[var(--radius-inner)] px-3 text-[0.9375rem] text-ink-2 transition-colors duration-[var(--dur-micro)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-[var(--color-accent)] aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-[0.4em]";

/**
 * Edge-aligned bar: the wordmark and three real destinations on the left,
 * language, log in and the start action on the right. Solid paper with a
 * hairline once the page moves under it; under 60rem the destinations fold
 * into a disclosure that works without script.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const locale = extractLocale(pathname);
  const nav = NAV[locale];
  const switchPath = switchLocalePath(pathname, locale);
  const destinations = [
    { href: localePath(locale, "/for-photographers"), label: nav.forPhotographers },
    { href: localePath(locale, "/for-couples"), label: nav.forCouples },
    { href: localePath(locale, "/pricing"), label: nav.pricing },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-[var(--z-sticky-nav)] border-b bg-paper transition-colors duration-[var(--dur-short)]",
        scrolled ? "border-rule" : "border-transparent",
      )}
    >
      <div className="shell flex h-[var(--nav-height)] items-center gap-4">
        <Link
          href={localePath(locale, "/")}
          aria-label={nav.home}
          className="rounded-[var(--radius-inner)] font-display text-[1.625rem] font-semibold tracking-[-0.02em] text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]"
        >
          {env.appName}
        </Link>

        <nav aria-label={nav.menuLabel} className="ml-6 hidden items-center gap-1 lg:flex">
          {destinations.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={linkClass}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href={switchPath} title={nav.switchTitle} hrefLang={locale === "en" ? "bs" : "en"} className={linkClass}>
            {nav.switchLabel}
          </Link>
          <Link href={localePath(locale, "/login")} className={cn(linkClass, "hidden sm:inline-flex")}>
            {nav.logIn}
          </Link>
          <Link href={localePath(locale, "/get-started")} className="btn btn-sm btn-secondary">
            {/* The full label crowded the wordmark off a 320 px screen. */}
            <span className="sm:hidden">{nav.startShort}</span>
            <span className="hidden sm:inline">{nav.startFree}</span>
          </Link>

          <details className="group relative lg:hidden">
            <summary
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-[var(--radius-inner)] text-ink-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden"
            >
              <span className="visually-hidden">{nav.menu}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" className="group-open:hidden" />
                <path d="M6 6l12 12M18 6 6 18" className="hidden group-open:block" />
              </svg>
            </summary>
            <nav
              aria-label={nav.menuLabel}
              className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 flex w-64 flex-col rounded-[var(--radius-card)] border border-rule bg-card p-2 shadow-[var(--shadow-overlay)]"
            >
              {destinations.map((item) => (
                <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={linkClass}>
                  {item.label}
                </Link>
              ))}
              <Link href={localePath(locale, "/login")} className={cn(linkClass, "sm:hidden")}>
                {nav.logIn}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
