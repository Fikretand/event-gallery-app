"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Panel } from "@/components/ui/panel";
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

export function DashboardEventList({ events }: { events: DashboardEventItem[] }) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredEvents = useMemo(() => {
    if (!normalizedQuery) {
      return events;
    }

    return events.filter((event) => {
      const haystack = [event.title, event.clientName ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [events, normalizedQuery]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Panel className="bg-white/88">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-black/45" htmlFor="dashboard-event-search">
              Search
            </label>
            <input
              id="dashboard-event-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events or clients"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-black/35 focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/15"
            />
          </div>

          <div className="flex items-center gap-3 text-sm text-black/55">
            <span className="rounded-full bg-[var(--color-paper)] px-4 py-2 font-medium text-[var(--color-ink)]">
              {filteredEvents.length} of {events.length}
            </span>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full border border-black/10 bg-white px-4 py-2 font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
              >
                Clear search
              </button>
            ) : null}
          </div>
        </div>
      </Panel>

      {filteredEvents.length === 0 ? (
        <Panel className="bg-white/90">
          <div className="rounded-[24px] border border-dashed border-black/10 bg-[var(--color-paper)]/55 px-6 py-12 text-center">
            <p className="text-xl font-semibold text-[var(--color-ink)]">No events match your search.</p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/58">
              Try a different event name or client name, or clear the search to see all events again.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
            >
              Clear search
            </button>
          </div>
        </Panel>
      ) : (
        filteredEvents.map((event) => (
          <Link key={event.id} href={`/dashboard/events/${event.slug}`}>
            <Panel className="mesh-card bg-white/88 transition hover:-translate-y-0.5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 overflow-hidden rounded-[22px] border border-black/10 bg-[var(--color-paper)] shadow-inner">
                    {event.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.coverUrl} alt={`${event.title} cover`} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.18),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-black/45">
                        No cover
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-moss)]">
                      {event.clientName || "Private event"}
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)]">{event.title}</h2>
                    <p className="mt-2 text-sm text-black/55">
                      Event date: {formatDate(event.eventDate)} | Expires: {formatDate(event.expiresAt)}
                    </p>
                    </div>
                </div>

                <div className="flex gap-3 text-sm text-black/55">
                  <span className="rounded-full bg-[var(--color-paper)] px-4 py-2">Slug: {event.slug}</span>
                  <span className={cn("rounded-full px-4 py-2 capitalize", statusBadgeClass(event.lifecycleStatus))}>
                    {event.lifecycleStatus}
                  </span>
                </div>
              </div>
            </Panel>
          </Link>
        ))
      )}
    </div>
  );
}
