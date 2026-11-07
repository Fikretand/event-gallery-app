import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminPage } from "@/lib/admin-guard";
import { eventLinks, getCoupleUploadEndsAt, isEventExpired } from "@/lib/events";
import { getSupportEvent, isStuck } from "@/lib/support";
import { formatBytes } from "@/lib/utils";

import { SupportEventActions, SupportFileRetry, SupportReportActions } from "./support-event-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REASONS: Record<string, string> = {
  inappropriate: "Inappropriate",
  private: "Private",
  other: "Other",
  unspecified: "No reason",
};

const ACTIONS: Record<string, string> = {
  media_hidden: "File hidden",
  media_unhidden: "File shown",
  media_soft_deleted: "File moved to trash",
  media_restored: "File restored",
  media_permanently_deleted: "File deleted for good",
  cover_set: "Cover set",
  cover_cleared: "Cover cleared",
};

function stamp(iso: string | null) {
  if (!iso) return "none";
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sarajevo" });
}

/** One event as support sees it: health, settings, problem files, reports, history. */
export default async function SupportEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getSupportEvent(id);
  if (!detail) notFound();

  const { event, owner, counts, storageBytes, problemFiles, reports, activity, guestSessions, downloads } = detail;
  const settings = event.event_settings;
  const links = eventLinks(event.slug);
  const expired = isEventExpired(event);
  const uploadEnds = owner?.account_type === "couple" ? getCoupleUploadEndsAt(event) : null;

  const facts: [string, string][] = [
    ["Owner", owner ? `${owner.full_name ?? owner.email} (${owner.account_type})` : "unknown"],
    ["Event date", stamp(event.event_date)],
    ["Created", stamp(event.created_at)],
    ["Gallery open until", event.expires_at ? `${stamp(event.expires_at)}${expired ? ", closed" : ""}` : "no end"],
    ...(uploadEnds ? ([["Guest uploads until", stamp(uploadEnds)]] as [string, string][]) : []),
    ["Guest uploads", settings?.allow_guest_upload ? "on" : "off"],
    ["Guest video", settings?.allow_guest_video ? "on" : "off"],
    ["Video messages", settings?.allow_video_messages === false ? "off" : "on"],
    ["Approval before showing", settings?.require_upload_approval ? "on" : "off (shown at once)"],
    ["Gallery PIN", event.gallery_pin_hash && settings?.require_pin_for_gallery ? "required" : "none"],
    ["Upload PIN", event.upload_pin_hash && settings?.require_pin_for_upload ? "required" : "none"],
    ["Guest upload limit", settings ? `${settings.max_guest_upload_mb} MB per file` : "default"],
  ];

  const stats: [string, number | string][] = [
    ["Ready", counts.ready],
    ["Failed", counts.failed],
    ["Stuck", counts.stuck],
    ["Processing", counts.processing],
    ["Hidden", counts.hidden],
    ["In trash", counts.deleted],
    ["Video messages", counts.messages],
    ["Guest visits", guestSessions],
    ["Downloads", downloads],
    ["Storage", formatBytes(storageBytes)],
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/support" className="hover:text-ink">
          Support
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{event.title}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="app-title text-ink">{event.title}</h1>
          <p className="meta mt-1">
            /{event.slug}
            {event.client_name ? `, ${event.client_name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {owner ? (
            <Link href={`/admin/users/${owner.id}`} className="btn btn-sm btn-secondary">
              Owner account
            </Link>
          ) : null}
          <a href={links.galleryUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
            Gallery page
          </a>
          <a href={links.uploadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
            Guest upload page
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-rule sm:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <dt className="meta">{label}</dt>
            <dd className={`num mt-1 text-lg font-semibold ${label === "Failed" && counts.failed ? "text-error" : label === "Stuck" && counts.stuck ? "text-warning" : "text-ink"}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="files-head" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="files-head" className="app-section-title text-ink">
                Problem files
              </h2>
              {problemFiles.length ? <SupportFileRetry eventId={event.id} label={`Retry all (${Math.min(problemFiles.length, 25)})`} /> : null}
            </div>
            {problemFiles.length === 0 ? (
              <p className="text-ink-2">Every file processed.</p>
            ) : (
              <ul className="border-t border-rule">
                {problemFiles.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{file.original_filename}</p>
                      <p className="meta">
                        {file.mime_type}, {formatBytes(file.size_bytes)}, {file.source_type}, {stamp(file.created_at)}, tries: {file.processing_attempts ?? 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`chip ${file.status === "failed" ? "chip-error" : "chip-warning"}`}>{isStuck(file) ? "stuck" : file.status}</span>
                      <SupportFileRetry eventId={event.id} mediaId={file.id} label="Retry" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="meta">
              A failed file is never lost: the original stays in storage, and it is listed for the owner without a thumbnail. Retrying makes the thumbnail again.
            </p>
          </section>

          <section aria-labelledby="reports-head" className="space-y-3">
            <h2 id="reports-head" className="app-section-title text-ink">
              Reports
            </h2>
            {reports.length === 0 ? (
              <p className="text-ink-2">No photo in this gallery is reported.</p>
            ) : (
              <ul className="border-t border-rule">
                {reports.map((report) => (
                  <li key={report.media_id} className="flex flex-col gap-3 border-b border-rule py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{report.filename ?? "Deleted file"}</p>
                      <p className="meta">
                        {Object.entries(report.reasons)
                          .map(([reason, n]) => `${REASONS[reason] ?? reason} (${n})`)
                          .join(", ")}
                        ; last {stamp(report.latest)}
                        {report.hidden ? "; already hidden" : ""}
                      </p>
                    </div>
                    <SupportReportActions eventId={event.id} mediaId={report.media_id} hidden={report.hidden} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="activity-head" className="space-y-3">
            <h2 id="activity-head" className="app-section-title text-ink">
              Recent changes by the owner
            </h2>
            {activity.length === 0 ? (
              <p className="text-ink-2">Nothing recorded yet.</p>
            ) : (
              <ul className="border-t border-rule">
                {activity.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-rule py-2.5 text-sm">
                    <span className="text-ink">{ACTIONS[item.action] ?? item.action}</span>
                    <span className="meta">{stamp(item.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="settings-head" className="card p-5">
            <h2 id="settings-head" className="app-section-title text-ink">
              Settings
            </h2>
            <dl className="mt-3 divide-y divide-rule text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <SupportEventActions eventId={event.id} guestUploadOn={Boolean(settings?.allow_guest_upload)} />
        </aside>
      </div>
    </div>
  );
}
