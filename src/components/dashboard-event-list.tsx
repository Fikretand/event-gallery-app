"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteEventFromListAction } from "@/lib/actions";
import type { Dict } from "@/lib/i18n/index";
import { cn, formatDate, statusBadgeClass } from "@/lib/utils";

type DashboardEventItem = {
  id: string;
  slug: string;
  title: string;
  clientName: string | null;
  eventDate: string | null;
  expiresAt: string | null;
  coverUrl: string | null;
  lifecycleStatus: string;
};

type Strings = Dict["dashboard"]["eventList"];

/** `{{name}}` interpolation without pulling the whole dictionary into the client bundle. */
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function DashboardEventList({
  events,
  strings: s,
  locale,
  prefix,
}: {
  events: DashboardEventItem[];
  strings: Strings;
  locale: "en" | "bs";
  /** "" for English, "/bs" for Bosnian — keeps the reader in their language. */
  prefix: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const normalizedQuery = query.trim().toLowerCase();
  const visibleEvents = useMemo(() => events.filter((event) => !removed.has(event.slug)), [events, removed]);
  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) return visibleEvents;
    return visibleEvents.filter((event) =>
      [event.title, event.clientName ?? ""].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [visibleEvents, normalizedQuery]);

  function statusLabel(status: string) {
    return s.statuses[status as keyof Strings["statuses"]] ?? status;
  }

  function confirmDelete(slug: string) {
    setFailed(null);
    startDelete(async () => {
      try {
        await deleteEventFromListAction(slug);
        setRemoved((current) => new Set(current).add(slug));
        setConfirming(null);
        // Stats and usage cards above the list are server-rendered; refresh them too.
        router.refresh();
      } catch {
        setFailed(slug);
      }
    });
  }

  if (visibleEvents.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Search, with the count beside it */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md" htmlFor="dashboard-event-search">
          <span className="field-label">{s.searchLabel}</span>
          <input
            id="dashboard-event-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={s.searchPlaceholder}
            className="field field-sm"
          />
        </label>
        <p className="num flex min-h-10 items-center text-sm text-ink-2" aria-live="polite">
          {fill(s.count, { shown: filteredEvents.length, total: visibleEvents.length })}
        </p>
        {query ? (
          <button type="button" onClick={() => setQuery("")} className="btn btn-sm btn-quiet">
            {s.clearSearch}
          </button>
        ) : null}
      </div>

      {filteredEvents.length === 0 ? (
        <div className="well mt-[var(--space-lg)] px-6 py-10">
          <p className="app-section-title text-ink">{s.noMatchTitle}</p>
          <p className="mt-2 max-w-xl text-ink-2">{s.noMatchBody}</p>
          <button type="button" onClick={() => setQuery("")} className="btn btn-sm btn-secondary mt-5">
            {s.clearSearch}
          </button>
        </div>
      ) : (
        <ul className="mt-[var(--space-lg)] border-t border-rule">
          {filteredEvents.map((event) => {
            const isConfirming = confirming === event.slug;
            return (
              <li key={event.id} className={cn("border-b border-rule py-4", isConfirming && "bg-error-soft/40")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={`${prefix}/dashboard/events/${event.slug}`}
                    className="group flex min-w-0 flex-1 items-center gap-4 rounded-[var(--radius-inner)]"
                  >
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-inner)] bg-paper-2">
                      {event.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center font-display text-2xl font-semibold text-muted" aria-hidden="true">
                          {event.title.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-lg font-semibold text-ink group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                        {event.title}
                      </span>
                      <span className="meta mt-0.5 block">{event.clientName || s.privateEvent}</span>
                      <span className="meta block">
                        {s.eventDate}: {formatDate(event.eventDate?.slice(0, 10), locale, s.notSet)}
                        <span className="mx-2 text-rule-2" aria-hidden="true">|</span>
                        {s.expires}: {formatDate(event.expiresAt, locale, s.notSet)}
                      </span>
                    </span>
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={cn("chip", statusBadgeClass(event.lifecycleStatus))}>{statusLabel(event.lifecycleStatus)}</span>
                    <span className="code hidden text-sm text-muted xl:inline">{event.slug}</span>
                    {isConfirming ? null : (
                      <button
                        type="button"
                        onClick={() => {
                          setFailed(null);
                          setConfirming(event.slug);
                        }}
                        className="btn btn-sm btn-quiet text-ink-2 hover:text-error"
                      >
                        {s.delete}
                      </button>
                    )}
                  </div>
                </div>

                {isConfirming ? (
                  <div
                    role="alertdialog"
                    aria-label={s.delete}
                    className="notice notice-error mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p>{failed === event.slug ? s.deleteFailed : fill(s.deleteConfirm, { title: event.title })}</p>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => setConfirming(null)} disabled={isDeleting} className="btn btn-sm btn-secondary">
                        {s.cancel}
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDelete(event.slug)}
                        disabled={isDeleting}
                        aria-busy={isDeleting}
                        className="btn btn-sm btn-danger"
                      >
                        {isDeleting ? s.deleting : s.deleteYes}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
