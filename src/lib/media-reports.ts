import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * "Report inappropriate" from the public gallery (table media_reports,
 * migration round3_additive.sql). Service role only: a browser can neither read
 * who reported what nor write a report except through /api/media/[id]/report,
 * which checks gallery access and rate-limits by address.
 *
 * A report only tells the owner; nothing is hidden automatically, or a few
 * false reports could take the photographer's own photos off the gallery.
 */

export const REPORT_REASONS = ["inappropriate", "private", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export function parseReportReason(value: unknown): ReportReason | null {
  return REPORT_REASONS.includes(value as ReportReason) ? (value as ReportReason) : null;
}

function admin() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase admin access is not configured.");
  }
  return client;
}

/** One report per file and reporter; a repeat is silently the same report. */
export async function recordMediaReport(input: {
  mediaId: string;
  eventId: string;
  reason: ReportReason | null;
  reporterHash: string;
}) {
  const { error } = await admin()
    .from("media_reports")
    .upsert(
      { media_id: input.mediaId, event_id: input.eventId, reason: input.reason, reporter_hash: input.reporterHash },
      { onConflict: "media_id,reporter_hash", ignoreDuplicates: true },
    );
  if (error) {
    throw new Error(error.message);
  }
}

/** Reports per file for one event, for the owner's gallery. */
export async function countReportsByMedia(eventId: string) {
  const { data, error } = await admin().from("media_reports").select("media_id").eq("event_id", eventId);
  if (error) {
    throw new Error(error.message);
  }
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.media_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** The owner has looked and decided: the file stays. */
export async function clearMediaReports(mediaId: string) {
  const { error } = await admin().from("media_reports").delete().eq("media_id", mediaId);
  if (error) {
    throw new Error(error.message);
  }
}
