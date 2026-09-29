"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EventSection = "overview" | "gallery" | "qr" | "settings";

type NavStrings = {
  menuLabel: string;
  navOverview: string;
  navGallery: string;
  navQrCard: string;
  navSettings: string;
  navPreview: string;
};

const ICONS: Record<EventSection | "preview", ReactNode> = {
  overview: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  gallery: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M3.5 16l5-5 4 4 3-3 5 5" />
      <circle cx="15.5" cy="9" r="1.5" />
    </>
  ),
  settings: <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4.5v5M8 14.5v5" />,
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />,
  preview: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}

/**
 * The event menu. It lives in the event layout, which Next keeps mounted
 * while moving between the event's pages, so it works out the active page
 * from the URL rather than being told by each page.
 */
export function EventNav({
  base,
  galleryUrl,
  galleryCount,
  strings: l,
}: {
  /** e.g. "/bs/dashboard/events/vjencanje" */
  base: string;
  galleryUrl: string;
  galleryCount: number;
  strings: NavStrings;
}) {
  const pathname = usePathname() ?? "";
  const active: EventSection = pathname.endsWith("/gallery")
    ? "gallery"
    : pathname.endsWith("/qr")
      ? "qr"
      : pathname.endsWith("/settings")
        ? "settings"
        : "overview";

  const primary: { key: EventSection; label: string; href: string; badge?: number }[] = [
    { key: "overview", label: l.navOverview, href: base },
    { key: "gallery", label: l.navGallery, href: `${base}/gallery`, badge: galleryCount },
    { key: "qr", label: l.navQrCard, href: `${base}/qr` },
    { key: "settings", label: l.navSettings, href: `${base}/settings` },
  ];

  const item =
    "flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition lg:rounded-2xl lg:px-3.5 lg:py-2.5";

  return (
    <nav
      aria-label={l.menuLabel}
      className="sticky top-0 z-30 -mx-4 bg-[var(--color-paper)]/88 px-4 py-2 backdrop-blur lg:top-6 lg:mx-0 lg:rounded-[24px] lg:border lg:border-black/8 lg:bg-white/80 lg:p-2 lg:shadow-[0_12px_40px_rgba(18,24,38,0.06)]"
    >
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {primary.map((entry) => {
          const isActive = entry.key === active;
          return (
            <li key={entry.key}>
              <Link
                href={entry.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  item,
                  isActive
                    ? "bg-[var(--color-ink)] text-white"
                    : "border border-black/10 bg-white/85 text-[var(--color-ink)] hover:bg-white lg:border-transparent lg:bg-transparent lg:hover:bg-[var(--color-paper)]",
                )}
              >
                <Icon name={entry.key} />
                {entry.label}
                {entry.badge ? (
                  <span
                    className={cn(
                      "ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      isActive ? "bg-white/18 text-white" : "bg-[var(--color-paper)] text-black/55",
                    )}
                  >
                    {entry.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}

        <li aria-hidden className="hidden lg:my-1 lg:block lg:border-t lg:border-black/8" />

        <li>
          <a
            href={galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              item,
              "border border-black/10 bg-white/85 text-black/65 hover:bg-white hover:text-[var(--color-ink)] lg:border-transparent lg:bg-transparent lg:font-medium lg:hover:bg-[var(--color-paper)]",
            )}
          >
            <Icon name="preview" />
            {l.navPreview}
          </a>
        </li>
      </ul>
    </nav>
  );
}
