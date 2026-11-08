/**
 * How fast the venue live view moves, from how many photos the gallery has.
 *
 * A few photos stay up long enough to look at; a big gallery moves faster so
 * the room sees more of it, but never faster than a photo can be taken in. The
 * curve is logarithmic between two anchors, 8 s at 10 photos and 4 s at 200,
 * so going from 10 to 30 photos changes the pace more than going from 150 to
 * 170 does:
 *
 *   photos     ≤10    30    50   100   200+
 *   seconds     8.0   6.5   5.9   4.9   4.0
 *
 * The QR code is a slide of its own between photos (it used to sit over every
 * photo). It comes after every 5 photos while they are slow and after every 10
 * or 15 as they speed up, so it returns roughly every 30 to 75 seconds, and it
 * stays up longer than a photo, so a guest has time to get their phone out.
 */

export const PHOTO_MS_MAX = 8_000;
export const PHOTO_MS_MIN = 4_000;
const SLOW_UNTIL = 10;
const FAST_FROM = 200;

/** How long one photo stays on screen. */
export function photoDurationMs(count: number): number {
  if (count <= SLOW_UNTIL) return PHOTO_MS_MAX;
  if (count >= FAST_FROM) return PHOTO_MS_MIN;
  const t = Math.log(count / SLOW_UNTIL) / Math.log(FAST_FROM / SLOW_UNTIL);
  const ms = PHOTO_MS_MAX - t * (PHOTO_MS_MAX - PHOTO_MS_MIN);
  return Math.round(ms / 100) * 100;
}

/**
 * How many photos play between two QR slides. With fewer photos than that,
 * the QR comes after each full round, so no photo repeats before it.
 */
export function qrEvery(count: number): number {
  const ms = photoDurationMs(count);
  const every = ms >= 6_500 ? 5 : ms >= 5_000 ? 10 : 15;
  return count > 0 ? Math.min(every, count) : every;
}

/** The QR slide stays 4 s longer than a photo, and never less than 10 s. */
export function qrDurationMs(count: number): number {
  return Math.max(10_000, photoDurationMs(count) + 4_000);
}
