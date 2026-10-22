import { canViewGallery, listEventMedia } from "@/lib/events";
import { enrichMediaWithUrls } from "@/lib/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRecord, MediaFileRecord } from "@/lib/types";

/**
 * The live view for a venue screen: the gallery's photos, newest first, as
 * slim slides. Only what the screen needs leaves the server (no guest names,
 * emails or storage keys).
 */
export type LiveSlide = {
  id: string;
  kind: "image" | "video";
  src: string;
  poster: string | null;
  createdAt: string;
  /** A guest upload nobody has reviewed yet (owner opt-in only). */
  pending: boolean;
};

/** Newest files kept on the screen; older ones have had their moment. */
export const LIVE_SLIDE_LIMIT = 200;

/**
 * Who is looking: the owner sees their event whatever its state; anyone else
 * needs the same access as the public gallery (open, unexpired, PIN if set).
 */
export async function resolveLiveAccess(event: EventRecord): Promise<"owner" | "viewer" | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (user && user.id === event.owner_user_id) return "owner";
  if (event.status === "archived") return null;
  return (await canViewGallery(event)) ? "viewer" : null;
}

/**
 * A guest upload still waiting for review. Guest files are stored hidden at the
 * moment they are recorded; a file the owner hid on purpose later carries a
 * later hidden_at. Only the first kind may ever reach the screen.
 */
export function isPendingGuestUpload(media: Pick<MediaFileRecord, "source_type" | "hidden_at" | "created_at">) {
  if (media.source_type !== "guest" || !media.hidden_at) return false;
  const gap = Math.abs(new Date(media.hidden_at).getTime() - new Date(media.created_at).getTime());
  return Number.isFinite(gap) && gap < 60_000;
}

export async function listLiveSlides(eventId: string, includePending: boolean) {
  const rows = await listEventMedia(eventId, {
    includeHidden: includePending,
    sourceType: "all",
    sortOrder: "desc",
  });

  const visible = rows
    .filter((row) => row.status !== "failed")
    .filter((row) => !row.hidden_at || (includePending && isPendingGuestUpload(row)))
    .slice(0, LIVE_SLIDE_LIMIT);

  const enriched = await enrichMediaWithUrls(visible);
  const slides: LiveSlide[] = [];

  for (const item of enriched) {
    const pending = Boolean(item.hidden_at);
    if (item.mime_type.startsWith("video/")) {
      if (!item.previewUrl) continue;
      slides.push({
        id: item.id,
        kind: "video",
        src: item.previewUrl,
        poster: item.thumbnail_key ? item.thumbnailUrl : null,
        createdAt: item.created_at,
        pending,
      });
      continue;
    }

    // The 1200 px thumbnail loads fast on venue Wi-Fi and fills a TV well.
    // Without one, only formats every browser can draw are shown.
    const src = item.thumbnail_key
      ? item.thumbnailUrl
      : /^image\/(jpeg|png|webp)$/i.test(item.mime_type)
        ? item.previewUrl
        : null;
    if (!src) continue;
    slides.push({ id: item.id, kind: "image", src, poster: null, createdAt: item.created_at, pending });
  }

  return slides;
}
