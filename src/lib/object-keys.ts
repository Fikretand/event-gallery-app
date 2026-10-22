/**
 * Which R2 objects a database row may point at.
 *
 * Keys are free text in the database, and the owner of a row can write some of
 * them directly (media_files through its RLS policy, users.avatar_url through
 * its column grant). Every place that signs, reads or deletes an object with
 * the service credentials checks the key against the row's own namespace
 * first, so a row cannot be pointed at another tenant's files.
 *
 * Server code only ever creates keys of these two shapes (media.ts, actions.ts):
 *   events/<event_id>/...            originals and thumbnails of one event
 *   users/<user_id>/avatar/<file>    one photographer's avatar
 */

function isPlainKey(key: string) {
  return !key.startsWith("/") && !key.includes("..") && !key.includes("\\") && !/[\u0000-\u001f\u007f]/.test(key);
}

export function isEventObjectKey(key: string | null | undefined, eventId: string | null | undefined): key is string {
  if (typeof key !== "string" || !eventId) return false;
  return isPlainKey(key) && key.startsWith(`events/${eventId}/`) && key.length > `events/${eventId}/`.length;
}

export function isUserAvatarKey(key: string | null | undefined, userId: string | null | undefined): key is string {
  if (typeof key !== "string" || !userId) return false;
  return isPlainKey(key) && key.startsWith(`users/${userId}/avatar/`) && key.length > `users/${userId}/avatar/`.length;
}

/** Logged once per refused key, so a tampered row is visible in the runtime logs. */
export function reportForeignKey(where: string, details: Record<string, unknown>) {
  console.error(`[object-keys] refused a key outside its namespace in ${where}`, details);
}
