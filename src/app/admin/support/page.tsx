import Link from "next/link";

import { requireAdminPage } from "@/lib/admin-guard";
import { STUCK_AFTER_MINUTES, listEventProblems, searchSupport } from "@/lib/support";

function when(iso: string | null) {
  if (!iso) return "no date";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Sarajevo" });
}

/**
 * Support: find the customer or the event a message is about, and see every
 * event where something went wrong without waiting for anyone to write in.
 */
export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const { q = "" } = await searchParams;
  const [problems, results] = await Promise.all([listEventProblems(), q ? searchSupport(q) : Promise.resolve(null)]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="app-title text-ink">Support</h1>
        <p className="mt-1 max-w-2xl text-ink-2">
          Find an account or an event, then open it to see its files, reports and history and fix what is wrong.
        </p>
      </div>

      <form method="get" className="flex max-w-xl flex-wrap gap-2" role="search">
        <label htmlFor="support-q" className="sr-only">
          Email, name, event title or slug
        </label>
        <input id="support-q" name="q" defaultValue={q} placeholder="Email, name, event title or slug" className="field min-w-0 flex-1" />
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      {results ? (
        <section aria-labelledby="results-head" className="space-y-4">
          <h2 id="results-head" className="app-section-title text-ink">
            Results for &quot;{q}&quot;
          </h2>
          {results.users.length === 0 && results.events.length === 0 ? <p className="text-ink-2">Nothing found. Try part of the email or the event slug.</p> : null}
          {results.users.length > 0 ? (
            <div>
              <p className="meta mb-2">Accounts</p>
              <ul className="border-t border-rule">
                {results.users.map((user) => (
                  <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{user.full_name ?? user.email}</p>
                      <p className="meta">
                        {user.email}, {user.account_type}
                      </p>
                    </div>
                    <Link href={`/admin/users/${user.id}`} className="btn btn-sm btn-secondary">
                      Open account
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results.events.length > 0 ? (
            <div>
              <p className="meta mb-2">Events</p>
              <ul className="border-t border-rule">
                {results.events.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{event.title}</p>
                      <p className="meta">
                        /{event.slug}, {event.owner?.email ?? "unknown owner"}, {when(event.event_date)}
                      </p>
                    </div>
                    <Link href={`/admin/support/events/${event.id}`} className="btn btn-sm btn-secondary">
                      Open event
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="problems-head" className="space-y-3">
        <div>
          <h2 id="problems-head" className="app-section-title text-ink">
            Needs a look
          </h2>
          <p className="meta mt-1">
            Files that failed, files stuck in processing for more than {STUCK_AFTER_MINUTES} minutes, and photos guests reported.
          </p>
        </div>
        {problems.length === 0 ? (
          <p className="well px-6 py-8 text-ink-2">Nothing open. Every file processed and no photo is reported.</p>
        ) : (
          <ul className="border-t border-rule">
            {problems.map((item) => (
              <li key={item.event.id} className="flex flex-col gap-3 border-b border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{item.event.title}</p>
                  <p className="meta">
                    {item.owner?.email ?? "unknown owner"}, last {when(item.latest)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.failed ? <span className="chip chip-error">{item.failed} failed</span> : null}
                    {item.stuck ? <span className="chip chip-warning">{item.stuck} stuck</span> : null}
                    {item.reports ? <span className="chip">{item.reports} reports</span> : null}
                  </div>
                </div>
                <Link href={`/admin/support/events/${item.event.id}`} className="btn btn-sm btn-secondary self-start sm:self-center">
                  Open event
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
