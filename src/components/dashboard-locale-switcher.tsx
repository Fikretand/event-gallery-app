"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/index";

/**
 * Two-state pill switcher in the dashboard header. Clicking the inactive
 * locale rewrites the current path with the new locale prefix:
 *
 *   /dashboard/events/foo   ←→  /bs/dashboard/events/foo
 *   /en/dashboard/profile   ←→  /bs/dashboard/profile
 *
 * Visual-only toggle — the user's persisted preference still lives in their
 * profile. Use this to peek at the other language without changing the
 * saved setting.
 */
export function DashboardLocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() ?? "/dashboard";

  function pathFor(locale: Locale): string {
    // Strip an existing locale prefix, if any.
    const stripped = pathname.replace(/^\/(en|bs)(?=\/|$)/, "") || "/dashboard";
    return locale === "en" ? stripped : `/${locale}${stripped}`;
  }

  return (
    <div className="inline-flex items-center rounded-full border border-black/10 bg-white/75 p-0.5 text-xs font-semibold">
      {(["en", "bs"] as const).map((locale) => {
        const active = locale === current;
        return active ? (
          <span
            key={locale}
            aria-current="true"
            className="rounded-full bg-[var(--color-ink)] px-3 py-1 text-white"
          >
            {locale.toUpperCase()}
          </span>
        ) : (
          <Link
            key={locale}
            href={pathFor(locale)}
            className="rounded-full px-3 py-1 text-[var(--color-ink)]/70 transition hover:text-[var(--color-ink)]"
          >
            {locale.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
