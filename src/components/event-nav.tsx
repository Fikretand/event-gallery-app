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
    "flex min-h-10 items-center gap-2.5 whitespace-nowrap rounded-[var(--radius-inner)] px-3 text-sm font-medium transition-colors duration-[var(--dur-micro)]";

  return (
    <nav
      aria-label={l.menuLabel}
      className="sticky top-0 z-[var(--z-sticky)] -mx-[var(--gutter)] border-b border-rule bg-paper px-[var(--gutter)] py-2 lg:top-6 lg:mx-0 lg:border-b-0 lg:bg-transparent lg:p-0"
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
                    ? "bg-paper-2 font-semibold text-ink"
                    : "text-ink-2 hover:bg-paper-2 hover:text-ink",
                )}
              >
                <Icon name={entry.key} />
                {entry.label}
                {entry.badge ? (
                  <span
                    className={cn(
                      "num ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                      isActive ? "bg-card text-ink" : "bg-paper-2 text-ink-2",
                    )}
                  >
                    {entry.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}

        <li aria-hidden className="hidden lg:my-1 lg:block lg:border-t lg:border-rule" />

        <li>
          <a
            href={galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              item,
              "text-ink-2 hover:bg-paper-2 hover:text-ink",
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
