/**
 * Per-event wording for everything a guest reads: the public gallery, its
 * PIN screen, the guest upload page and the "closed" messages.
 *
 * Stored in `events.custom_copy` as a flat object of dictionary paths to the
 * owner's text — `{"gallery.browseCurated": "…"}`. A missing key means the
 * standard text, so an event nobody customised behaves exactly as before.
 * The owner's text is shown in both languages: it is theirs, written once.
 *
 * Only fields listed here can be stored or applied, and only as plain text
 * rendered by React — never as HTML.
 */

import type { Dict } from "@/lib/i18n/index";

export type CopyGroup = "gallery" | "locked" | "guests" | "closed";

export type CopyField = {
  /** "section.field" in Dict, or "event.galleryTitle" / "event.uploadTitle". */
  key: string;
  group: CopyGroup;
  multiline?: boolean;
  max: number;
};

const SHORT = 80;
const LINE = 160;
const LONG = 600;

export const COPY_FIELDS: readonly CopyField[] = [
  // The gallery itself
  { key: "event.galleryTitle", group: "gallery", max: LINE },
  { key: "gallery.clientGallery", group: "gallery", max: SHORT },
  { key: "gallery.browseCurated", group: "gallery", multiline: true, max: LONG },
  { key: "galleryViewer.sectionEyebrow", group: "gallery", max: SHORT },
  { key: "galleryViewer.everythingElse", group: "gallery", max: SHORT },
  { key: "galleryViewer.moreMoments", group: "gallery", max: SHORT },
  { key: "galleryViewer.filterAll", group: "gallery", max: SHORT },
  { key: "galleryViewer.filterPhotos", group: "gallery", max: SHORT },
  { key: "galleryViewer.filterVideos", group: "gallery", max: SHORT },
  { key: "galleryViewer.filterPhotographer", group: "gallery", max: SHORT },
  { key: "galleryViewer.filterGuest", group: "gallery", max: SHORT },
  { key: "galleryViewer.select", group: "gallery", max: SHORT },
  { key: "galleryViewer.download", group: "gallery", max: SHORT },
  { key: "galleryViewer.downloadSelected", group: "gallery", max: SHORT },
  { key: "galleryViewer.cover", group: "gallery", max: SHORT },
  { key: "galleryViewer.swipeHint", group: "gallery", max: SHORT },
  { key: "galleryViewer.emptyTitle", group: "gallery", max: LINE },
  { key: "galleryViewer.emptyBody", group: "gallery", multiline: true, max: LONG },

  // The PIN screen in front of it
  { key: "gallery.privateGallery", group: "locked", max: SHORT },
  { key: "gallery.enterPin", group: "locked", multiline: true, max: LONG },
  { key: "gallery.privateNoAccess", group: "locked", multiline: true, max: LONG },
  { key: "galleryUnlock.pinLabel", group: "locked", max: SHORT },
  { key: "galleryUnlock.pinPlaceholder", group: "locked", max: LINE },
  { key: "galleryUnlock.unlock", group: "locked", max: SHORT },
  { key: "galleryUnlock.wrongPin", group: "locked", max: LINE },

  // The page behind the QR code
  { key: "event.uploadTitle", group: "guests", max: LINE },
  { key: "upload.badge", group: "guests", max: SHORT },
  { key: "uploadDropzone.chooseTitle", group: "guests", max: LINE },
  { key: "uploadDropzone.chooseSubtitle", group: "guests", multiline: true, max: LONG },
  { key: "uploadDropzone.selectPhotosBtn", group: "guests", max: SHORT },
  { key: "uploadDropzone.nameLabel", group: "guests", max: SHORT },
  { key: "uploadDropzone.namePlaceholder", group: "guests", max: SHORT },
  { key: "uploadDropzone.emailLabel", group: "guests", max: SHORT },
  { key: "uploadDropzone.emailPlaceholder", group: "guests", max: SHORT },
  { key: "uploadDropzone.pinLabel", group: "guests", max: SHORT },
  { key: "uploadDropzone.pinPlaceholder", group: "guests", max: LINE },
  { key: "uploadDropzone.reviewTitle", group: "guests", max: LINE },
  { key: "uploadDropzone.sendBtn", group: "guests", max: SHORT },
  { key: "uploadDropzone.uploadingTitle", group: "guests", max: LINE },
  { key: "uploadDropzone.keepPageOpen", group: "guests", max: LINE },
  { key: "uploadDropzone.successTitle", group: "guests", max: LINE },
  { key: "uploadDropzone.successBody", group: "guests", multiline: true, max: LONG },
  { key: "uploadDropzone.successNext", group: "guests", multiline: true, max: LONG },
  { key: "uploadDropzone.uploadAnotherBtn", group: "guests", max: SHORT },
  { key: "uploadDropzone.noAccountNeeded", group: "guests", max: LINE },
  { key: "upload.chipNoAccount", group: "guests", max: SHORT },
  { key: "upload.chipPinRequired", group: "guests", max: SHORT },
  { key: "upload.privacyNote", group: "guests", multiline: true, max: LONG },

  // When something is closed
  { key: "upload.closed", group: "closed", max: LINE },
  { key: "upload.closedDisabled", group: "closed", multiline: true, max: LONG },
  { key: "upload.closedExpired", group: "closed", multiline: true, max: LONG },
  { key: "upload.closedArchived", group: "closed", multiline: true, max: LONG },
  { key: "gallery.expired", group: "closed", multiline: true, max: LONG },
  { key: "gallery.archived", group: "closed", multiline: true, max: LONG },
];

export const COPY_GROUPS: readonly CopyGroup[] = ["gallery", "locked", "guests", "closed"];

const FIELD_BY_KEY = new Map(COPY_FIELDS.map((field) => [field.key, field]));

export type CustomCopy = Record<string, string>;

// Control characters other than newline and tab: invisible, and no reason to keep them.
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

/**
 * Whatever came from the form or the database, keep only known keys with
 * non-empty text, trimmed and capped. An empty field means "standard text",
 * so it is dropped rather than stored as "".
 */
export function sanitizeCustomCopy(input: unknown): CustomCopy {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: CustomCopy = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    const field = FIELD_BY_KEY.get(key);
    if (!field || typeof raw !== "string") continue;
    let value = raw.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "");
    value = field.multiline ? value.replace(/\n{3,}/g, "\n\n") : value.replace(/\s*\n\s*/g, " ");
    value = value.trim().slice(0, field.max).trim();
    if (value) out[key] = value;
  }
  return out;
}

/** The standard text for one field, in the dictionary's language. */
export function defaultCopy(dict: Dict, key: string, eventTitle: string): string {
  if (key.startsWith("event.")) return eventTitle;
  const [section, name] = key.split(".");
  const group = (dict as unknown as Record<string, Record<string, unknown>>)[section];
  const value = group?.[name];
  return typeof value === "string" ? value : "";
}

type Overridable = Pick<Dict, "gallery" | "galleryUnlock" | "upload" | "uploadDropzone" | "galleryViewer">;

/**
 * A copy of the dictionary sections guests see, with the owner's text laid
 * over the standard one. Sections nobody touched are returned as they are.
 */
export function applyCustomCopy<D extends Overridable>(dict: D, custom: unknown): D {
  const copy = sanitizeCustomCopy(custom);
  const result = { ...dict } as Record<string, unknown>;
  for (const [key, value] of Object.entries(copy)) {
    if (key.startsWith("event.")) continue;
    const [section, name] = key.split(".");
    const current = result[section] as Record<string, unknown> | undefined;
    if (!current || typeof current[name] !== "string") continue;
    result[section] = { ...current, [name]: value };
  }
  return result as D;
}

/** The event title as a page shows it, unless the owner gave that page its own. */
export function customTitle(custom: unknown, key: "event.galleryTitle" | "event.uploadTitle", title: string) {
  return sanitizeCustomCopy(custom)[key] ?? title;
}
