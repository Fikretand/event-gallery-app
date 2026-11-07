import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EventActivityRecord, EventRecord, ReportReason, UserRecord } from "@/lib/types";

/**
 * What /admin/support reads: the places where something went wrong for a
 * customer (files that never finished processing, reported photos) and a
 * search across accounts and events, so a message like "my guests' photos are
 * not showing" can be traced to the event and the file in a minute.
 *
 * Every read is service role; the pages call requireAdminPage() first.
 */

/** A file left "uploaded" or "processing" this long is stuck, not busy. */
export const STUCK_AFTER_MINUTES = 15;

type EventLite = Pick<EventRecord, "id" | "title" | "slug" | "owner_user_id" | "client_name" | "event_date" | "expires_at" | "status" | "created_at">;
type OwnerLite = Pick<UserRecord, "id" | "email" | "full_name" | "account_type">;

export type ProblemFile = {
  id: string;
  event_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  source_type: string;
  processing_attempts: number | null;
  created_at: string;
};

export type EventProblems = {
  event: EventLite;
  owner: OwnerLite | null;
  failed: number;
  stuck: number;
  reports: number;
  latest: string;
};

const EVENT_FIELDS = "id, title, slug, owner_user_id, client_name, event_date, expires_at, status, created_at";
const OWNER_FIELDS = "id, email, full_name, account_type";
const FILE_FIELDS = "id, event_id, original_filename, mime_type, size_bytes, status, source_type, processing_attempts, created_at";

function stuckCutoff() {
  return new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
}

export function isStuck(file: Pick<ProblemFile, "status" | "created_at">, now = Date.now()) {
  return (file.status === "uploaded" || file.status === "processing") && new Date(file.created_at).getTime() < now - STUCK_AFTER_MINUTES * 60_000;
}

async function eventsAndOwners(eventIds: string[]) {
  const admin = createSupabaseAdminClient();
  if (!admin || eventIds.length === 0) return { events: new Map<string, EventLite>(), owners: new Map<string, OwnerLite>() };
  const { data: eventRows } = await admin.from("events").select(EVENT_FIELDS).in("id", eventIds);
  const events = new Map((eventRows ?? []).map((row) => [row.id as string, row as EventLite]));
  const ownerIds = [...new Set([...events.values()].map((e) => e.owner_user_id))];
  const { data: ownerRows } = ownerIds.length ? await admin.from("users").select(OWNER_FIELDS).in("id", ownerIds) : { data: [] };
  const owners = new Map((ownerRows ?? []).map((row) => [row.id as string, row as OwnerLite]));
  return { events, owners };
}

/**
 * Events with something wrong, worst first: files that failed or got stuck in
 * processing, and photos guests reported. Newest problem first among equals.
 */
export async function listEventProblems(): Promise<EventProblems[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const [{ data: failedRows }, { data: stuckRows }, { data: reportRows }] = await Promise.all([
    admin.from("media_files").select("event_id, created_at").eq("status", "failed").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
    admin
      .from("media_files")
      .select("event_id, created_at")
      .in("status", ["uploaded", "processing"])
      .lt("created_at", stuckCutoff())
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1000),
    admin.from("media_reports").select("event_id, created_at").order("created_at", { ascending: false }).limit(2000),
  ]);

  const byEvent = new Map<string, { failed: number; stuck: number; reports: number; latest: string }>();
  const bump = (rows: { event_id: string; created_at: string }[] | null, key: "failed" | "stuck" | "reports") => {
    for (const row of rows ?? []) {
      const entry = byEvent.get(row.event_id) ?? { failed: 0, stuck: 0, reports: 0, latest: row.created_at };
      entry[key] += 1;
      if (row.created_at > entry.latest) entry.latest = row.created_at;
      byEvent.set(row.event_id, entry);
    }
  };
  bump(failedRows, "failed");
  bump(stuckRows, "stuck");
  bump(reportRows, "reports");

  const { events, owners } = await eventsAndOwners([...byEvent.keys()]);
  return [...byEvent.entries()]
    .flatMap(([eventId, counts]) => {
      const event = events.get(eventId);
      return event ? [{ event, owner: owners.get(event.owner_user_id) ?? null, ...counts }] : [];
    })
    .sort((a, b) => b.failed + b.stuck - (a.failed + a.stuck) || b.latest.localeCompare(a.latest));
}

export type SupportSearch = {
  users: OwnerLite[];
  events: (EventLite & { owner: OwnerLite | null })[];
};

/** Strip what PostgREST's `or()` filter would read as syntax. */
export function cleanSearchTerm(raw: string) {
  return raw.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Accounts by email or name, events by title, slug or client name. */
export async function searchSupport(raw: string): Promise<SupportSearch> {
  const admin = createSupabaseAdminClient();
  const term = cleanSearchTerm(raw);
  if (!admin || term.length < 2) return { users: [], events: [] };
  const like = `%${term}%`;

  const [{ data: userRows }, { data: eventRows }] = await Promise.all([
    admin.from("users").select(OWNER_FIELDS).or(`email.ilike.${like},full_name.ilike.${like}`).limit(20),
    admin.from("events").select(EVENT_FIELDS).or(`title.ilike.${like},slug.ilike.${like},client_name.ilike.${like}`).limit(20),
  ]);

  const users = (userRows ?? []) as OwnerLite[];
  const eventList = (eventRows ?? []) as EventLite[];
  const { owners } = await eventsAndOwners(eventList.map((e) => e.id));
  return { users, events: eventList.map((event) => ({ ...event, owner: owners.get(event.owner_user_id) ?? null })) };
}

export type SupportReport = { media_id: string; filename: string | null; reasons: Partial<Record<ReportReason | "unspecified", number>>; total: number; latest: string; hidden: boolean };

export type SupportEvent = {
  event: EventRecord;
  owner: OwnerLite | null;
  counts: Record<"ready" | "failed" | "stuck" | "processing" | "hidden" | "deleted" | "messages" | "total", number>;
  storageBytes: number;
  problemFiles: ProblemFile[];
  reports: SupportReport[];
  activity: EventActivityRecord[];
  guestSessions: number;
  downloads: number;
};

/** Everything support needs about one event, in one parallel read. */
export async function getSupportEvent(eventId: string): Promise<SupportEvent | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const { data: eventRow } = await admin.from("events").select("*, event_settings(*)").eq("id", eventId).maybeSingle();
  if (!eventRow) return null;
  const event = {
    ...eventRow,
    event_settings: Array.isArray(eventRow.event_settings) ? (eventRow.event_settings[0] ?? null) : eventRow.event_settings,
  } as EventRecord;

  const [{ data: owner }, { data: mediaRows }, { data: reportRows }, { data: activity }, { count: guestSessions }, { count: downloads }] = await Promise.all([
    admin.from("users").select(OWNER_FIELDS).eq("id", event.owner_user_id).maybeSingle(),
    admin.from("media_files").select(`${FILE_FIELDS}, hidden_at, deleted_at, purpose`).eq("event_id", eventId).limit(20000),
    admin.from("media_reports").select("media_id, reason, created_at").eq("event_id", eventId).limit(2000),
    admin.from("event_activity_logs").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(15),
    admin.from("guest_upload_sessions").select("*", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("downloads").select("*", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  type Row = ProblemFile & { hidden_at: string | null; deleted_at: string | null; purpose: string | null };
  const rows = (mediaRows ?? []) as Row[];
  const now = Date.now();
  const counts = { ready: 0, failed: 0, stuck: 0, processing: 0, hidden: 0, deleted: 0, messages: 0, total: rows.length };
  let storageBytes = 0;
  const problemFiles: ProblemFile[] = [];
  for (const row of rows) {
    storageBytes += row.size_bytes ?? 0;
    if (row.deleted_at) {
      counts.deleted += 1;
      continue;
    }
    if (row.hidden_at) counts.hidden += 1;
    if (row.purpose === "message") counts.messages += 1;
    if (row.status === "ready") counts.ready += 1;
    else if (row.status === "failed") {
      counts.failed += 1;
      problemFiles.push(row);
    } else if (isStuck(row, now)) {
      counts.stuck += 1;
      problemFiles.push(row);
    } else counts.processing += 1;
  }
  problemFiles.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const byMedia = new Map<string, SupportReport>();
  const fileById = new Map(rows.map((row) => [row.id, row]));
  for (const report of (reportRows ?? []) as { media_id: string; reason: ReportReason | null; created_at: string }[]) {
    const file = fileById.get(report.media_id);
    const entry = byMedia.get(report.media_id) ?? {
      media_id: report.media_id,
      filename: file?.original_filename ?? null,
      reasons: {},
      total: 0,
      latest: report.created_at,
      hidden: Boolean(file?.hidden_at || file?.deleted_at),
    };
    const key = report.reason ?? "unspecified";
    entry.reasons[key] = (entry.reasons[key] ?? 0) + 1;
    entry.total += 1;
    if (report.created_at > entry.latest) entry.latest = report.created_at;
    byMedia.set(report.media_id, entry);
  }

  return {
    event,
    owner: (owner ?? null) as OwnerLite | null,
    counts,
    storageBytes,
    problemFiles: problemFiles.slice(0, 50),
    reports: [...byMedia.values()].sort((a, b) => b.latest.localeCompare(a.latest)),
    activity: (activity ?? []) as EventActivityRecord[],
    guestSessions: guestSessions ?? 0,
    downloads: downloads ?? 0,
  };
}
