import Link from "next/link";

import { requireAdminPage } from "@/lib/admin-guard";
import { env, hasEmail, hasWhop } from "@/lib/env";
import { formatEmailDate } from "@/lib/lead-emails";
import { OFFER_FULL_PRICE_BAM, OFFER_PRICE_BAM } from "@/lib/lead-sequence";
import { getLeadSettings, leadStats, listLeadsForAdmin, MAX_EMAIL_ATTEMPTS, type AdminLead } from "@/lib/leads";
import { formatBam } from "@/lib/pricing";

import { LeadRowActions, LeadSettingsForm, RunSequenceButton } from "./lead-admin-controls";

const FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "redeemed", label: "Used" },
  { key: "expired", label: "Expired" },
  { key: "unsubscribed", label: "Unsubscribed" },
];

const KINDS = [
  { kind: "welcome", label: "Code" },
  { kind: "reminder", label: "Reminder" },
  { kind: "final", label: "Last offer" },
] as const;

function day(iso: string | null) {
  return iso ? formatEmailDate(iso, "en") : "";
}

function statusChip(lead: AdminLead) {
  if (lead.status === "redeemed") return { label: `Used, ${lead.redeemed_price_bam ? formatBam(lead.redeemed_price_bam) : "paid"}`, chip: "chip-moss" };
  if (lead.boughtWithoutCode) return { label: "Bought without code", chip: "chip-moss" };
  if (lead.status === "expired") return { label: "Expired", chip: "" };
  return { label: "Active", chip: "chip-accent" };
}

/**
 * The lead offer at a glance: is it ready to run, how many signed up and
 * bought, which emails went out, and every lead with its code and history.
 */
export default async function AdminLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdminPage();
  const { status = "", q = "" } = await searchParams;
  const [settings, stats, leads] = await Promise.all([getLeadSettings(), leadStats(), listLeadsForAdmin({ status, q })]);

  const problems = [
    !hasEmail && "RESEND_API_KEY is not set in Vercel: no email can go out.",
    !hasWhop && "Whop is not configured: codes cannot be used at checkout.",
    hasWhop && !env.whopPlanOneEventOffer && `WHOP_PLAN_ONE_EVENT_OFFER is not set: the ${formatBam(OFFER_PRICE_BAM.offer)} price cannot be charged.`,
    hasWhop && !env.whopPlanOneEventOfferFinal && `WHOP_PLAN_ONE_EVENT_OFFER_FINAL is not set: the last-offer ${formatBam(OFFER_PRICE_BAM.final)} price cannot be charged.`,
    !settings.is_active && "The offer is switched off: /popust shows a closed message.",
    stats.lastError &&
      `${stats.failedEmails} email${stats.failedEmails === 1 ? "" : "s"} waiting. Last error from Resend: "${stats.lastError.error}". Failed emails are tried again every day at 09:00, or now with "Send due emails now"; a missing key or an unverified domain never uses up their tries.`,
  ].filter(Boolean) as string[];

  const conversion = stats.total ? Math.round(((stats.redeemed) / stats.total) * 100) : 0;
  const tiles: [string, string][] = [
    ["Leads", String(stats.total)],
    ["Last 7 days", String(stats.last7Days)],
    ["Active codes", String(stats.active)],
    ["Used", `${stats.redeemed} (${conversion}%)`],
    ["Paid with codes", formatBam(stats.revenueBam)],
    ["Expired", String(stats.expired)],
    ["Unsubscribed", String(stats.unsubscribed)],
    ["Emails sent", `${stats.emails.welcome} / ${stats.emails.reminder} / ${stats.emails.final}`],
    ["Failed emails", String(stats.failedEmails)],
  ];
  const exportHref = `/api/admin/leads/export${status ? `?status=${status}` : ""}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-title text-ink">Leads</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            People who left their email on{" "}
            <a href="/bs/popust" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              /popust
            </a>{" "}
            for One Event at {formatBam(OFFER_PRICE_BAM.offer)} instead of {formatBam(OFFER_FULL_PRICE_BAM)}, and {formatBam(OFFER_PRICE_BAM.final)} in the
            last days. Ad links can carry utm_source, utm_medium and utm_campaign; they show up as the source.
          </p>
        </div>
        <RunSequenceButton />
      </div>

      {problems.length ? (
        <ul className="notice notice-warning space-y-1">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : (
        <p className="notice notice-success">Ready: emails go out through Resend from {env.emailFrom}, and codes are charged through Whop.</p>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="meta">{label}</dt>
            <dd className="num mt-1 text-lg font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="meta -mt-6">Emails sent: code / reminder / last offer.</p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-labelledby="sources-head" className="min-w-0">
          <h2 id="sources-head" className="app-section-title text-ink">
            Where leads come from
          </h2>
          {stats.sources.length === 0 ? (
            <p className="mt-2 text-ink-2">No leads yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-muted">
                  <th className="py-2 font-medium">Source</th>
                  <th className="py-2 text-right font-medium">Leads</th>
                  <th className="py-2 text-right font-medium">Used</th>
                </tr>
              </thead>
              <tbody>
                {stats.sources.map((row) => (
                  <tr key={row.source} className="border-b border-rule">
                    <td className="py-2 text-ink">{row.source}</td>
                    <td className="num py-2 text-right">{row.count}</td>
                    <td className="num py-2 text-right">{row.redeemed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <LeadSettingsForm settings={settings} />
      </div>

      <section aria-labelledby="list-head" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="list-head" className="app-section-title text-ink">
            All leads
          </h2>
          <a href={exportHref} className="btn btn-sm btn-secondary">
            Export CSV
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/leads${f.key ? `?status=${f.key}` : ""}`}
              aria-current={status === f.key ? "page" : undefined}
              className={`btn btn-sm ${status === f.key ? "btn-ink" : "btn-quiet"}`}
            >
              {f.label}
            </Link>
          ))}
          <form method="get" className="ml-auto flex gap-2" role="search">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <label htmlFor="lead-q" className="sr-only">
              Email or code
            </label>
            <input id="lead-q" name="q" defaultValue={q} placeholder="Email or code" className="field h-9 w-56" />
            <button type="submit" className="btn btn-sm btn-secondary">
              Search
            </button>
          </form>
        </div>

        {leads.length === 0 ? (
          <p className="well px-6 py-8 text-ink-2">No leads here.</p>
        ) : (
          <ul className="border-t border-rule">
            {leads.map((lead) => {
              const chip = statusChip(lead);
              return (
                <li key={lead.id} className="flex flex-col gap-3 border-b border-rule py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-ink">{lead.email}</p>
                      <span className={`chip ${chip.chip}`}>{chip.label}</span>
                      {lead.unsubscribed_at ? <span className="chip">Unsubscribed</span> : null}
                    </div>
                    <p className="meta">
                      <span className="code">{lead.code}</span>, signed up {day(lead.created_at)}, expires {day(lead.expires_at)}
                      {lead.source ? `, from ${lead.source}${lead.campaign ? ` (${lead.campaign})` : ""}` : ""}
                      {lead.redeemed_at ? `, used ${day(lead.redeemed_at)}` : ""}
                    </p>
                    {lead.last_checkout_error && lead.status !== "redeemed" ? (
                      <p className="text-sm text-error">
                        Checkout failed {day(lead.last_checkout_error_at)}: {lead.last_checkout_error}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {KINDS.map(({ kind, label }) => {
                        const e = lead.emails.find((x) => x.kind === kind);
                        if (!e) return null;
                        const failed = e.status === "failed";
                        const title = failed ? `${e.error ?? "failed"} (try ${e.attempts} of ${MAX_EMAIL_ATTEMPTS})` : undefined;
                        return (
                          <span key={kind} title={title} className={`chip ${e.status === "sent" ? "chip-moss" : failed ? "chip-error" : "chip-warning"}`}>
                            {label}: {e.status === "sent" ? day(e.sent_at) : e.status}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <LeadRowActions leadId={lead.id} />
                </li>
              );
            })}
          </ul>
        )}
        {leads.length === 500 ? <p className="meta">Showing the latest 500. Search or export for the rest.</p> : null}
      </section>
    </div>
  );
}
