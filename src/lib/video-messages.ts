import type { EventSettingsRecord, MediaPurpose } from "@/lib/types";

/**
 * Guest video messages: a short clip recorded for the hosts ("congratulations
 * to the couple"), kept apart from the gallery's photos and videos.
 *
 * What makes a file a message is its object key, events/<id>/guest/messages/…,
 * minted by the upload-session route and signed into the confirm grant like the
 * event and the source. The client never says "this is a message" at confirm.
 */

/**
 * Longest message: the in-page recorder stops itself at this many seconds, and
 * a clip from the phone's own camera (the fallback) is refused in the browser
 * from its metadata. The server cannot read a video's length, so it holds the
 * line on size instead (MESSAGE_MAX_MB).
 */
export const MESSAGE_MAX_SECONDS = 20;

/**
 * Largest message file. The recorder makes about 5 MB for 20 s; the phone
 * camera fallback can record 4K, which is the reason for the headroom.
 */
export const MESSAGE_MAX_MB = 80;

const MESSAGE_KEY_RE = /^events\/[^/]+\/guest\/messages\//;

export function purposeFromObjectKey(key: string): MediaPurpose {
  return MESSAGE_KEY_RE.test(key) ? "message" : "media";
}

/** Messages are videos by definition, whatever the event's guest-video switch says. */
export function settingsForPurpose(settings: EventSettingsRecord | null | undefined, purpose: MediaPurpose) {
  if (purpose !== "message" || !settings) return settings;
  return {
    ...settings,
    allow_guest_video: true,
    max_guest_upload_mb: Math.min(settings.max_guest_upload_mb ?? MESSAGE_MAX_MB, MESSAGE_MAX_MB),
  };
}

export function videoMessagesEnabled(settings: EventSettingsRecord | null | undefined) {
  return Boolean(settings?.allow_guest_upload) && settings?.allow_video_messages !== false;
}
