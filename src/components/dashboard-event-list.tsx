"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Panel } from "@/components/ui/panel";
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
    <div className="space-y-4">
      <Panel className="bg-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-semibold text-muted" htmlFor="dashboard-event-search">
              {s.searchLabel}
            </label>
            <input
              id="dashboard-event-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.searchPlaceholder}
              className="mt-2 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-muted focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/15"
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-ink-2">
            <span className="rounded-full bg-[var(--color-paper)] px-4 py-2 font-medium text-[var(--color-ink)]">
              {fill(s.count, { shown: filteredEvents.length, total: visibleEvents.length })}
            </span>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full border border-rule bg-white px-4 py-2 font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)]"
              >
                {s.clearSearch}
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      {filteredEvents.length === 0 ? (
        <Panel className="bg-card">
          <div className="rounded-[24px] border border-dashed border-rule bg-[var(--color-paper)]/55 px-6 py-12 text-center">
            <p className="text-xl font-semibold text-[var(--color-ink)]">{s.noMatchTitle}</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-2">{s.noMatchBody}</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-full border border-rule bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)]"
            >
              {s.clearSearch}
            </button>
          </div>
        </Panel>
      ) : (
        filteredEvents.map((event) => {
          const isConfirming = confirming === event.slug;
          return (
            <Panel
              key={event.id}
              className={cn(
                "mesh-card bg-card transition-colors",
                isConfirming ? "ring-2 ring-[var(--color-error-soft)]" : "hover:-translate-y-0.5",
              )}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <Link href={`${prefix}/dashboard/events/${event.slug}`} className="flex min-w-0 items-center gap-4">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border border-rule bg-[var(--color-paper)]">
                    {event.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--color-accent)_18%,_transparent),_transparent_55%),linear-gradient(135deg,_color-mix(in_oklch,_var(--color-ink)_8%,_transparent),_color-mix(in_oklch,_var(--color-paper)_92%,_transparent))] px-2 text-center text-xs font-semibold text-muted">
                        {s.noCover}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-moss)]">
                      {event.clientName || s.privateEvent}
                    </p>
                    <h2 className="mt-2 truncate font-display text-2xl font-semibold text-[var(--color-ink)]">{event.title}</h2>
                    <p className="mt-2 text-sm text-ink-2">
                      {s.eventDate}: {formatDate(event.eventDate?.slice(0, 10), locale, s.notSet)} · {s.expires}:{" "}
                      {formatDate(event.expiresAt, locale, s.notSet)}
                    </p>
                  </div>
                </Link>

                <div className="flex flex-wrap items-center gap-3 text-sm text-ink-2">
                  <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">{event.slug}</span>
                  <span className={cn("rounded-full px-4 py-2", statusBadgeClass(event.lifecycleStatus))}>
                    {statusLabel(event.lifecycleStatus)}
                  </span>
                  {isConfirming ? null : (
                    <button
                      type="button"
                      onClick={() => {
                        setFailed(null);
                        setConfirming(event.slug);
                      }}
                      className="rounded-full border border-rule bg-white px-4 py-2 font-semibold text-[var(--color-error)] transition-colors hover:border-[var(--color-error-soft)] hover:bg-[var(--color-error-soft)]"
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
                  className="mt-4 flex flex-col gap-3 rounded-[20px] bg-[var(--color-error-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm leading-6 text-[var(--color-error)]">
                    {failed === event.slug ? s.deleteFailed : fill(s.deleteConfirm, { title: event.title })}
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      disabled={isDeleting}
                      className="rounded-full border border-rule bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper)] disabled:opacity-60"
                    >
                      {s.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(event.slug)}
                      disabled={isDeleting}
                      className="rounded-full bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-error)] disabled:opacity-60"
                    >
                      {isDeleting ? s.deleting : s.deleteYes}
                    </button>
                  </div>
                </div>
              ) : null}
            </Panel>
          );
        })
      )}
    </div>
  );
}
