"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { env } from "@/lib/env";
import { MarketingButtonLink } from "@/components/marketing-button-link";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-[var(--color-ink)]"
        >
          {env.appName}
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link
            href="/for-photographers"
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            For photographers
          </Link>
          <Link
            href="/for-couples"
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            For couples
          </Link>
          <Link
            href="/pricing"
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            Pricing
          </Link>
        </nav>
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-black/65 transition hover:bg-white/80 hover:text-[var(--color-ink)]"
          >
            Log in
          </Link>
          <MarketingButtonLink
            href="/signup?intent=photographer"
            className="whitespace-nowrap shadow-[0_4px_16px_rgba(226,121,82,0.22)]"
          >
            Start free
          </MarketingButtonLink>
        </nav>
      </div>
    </header>
  );
}
