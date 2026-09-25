import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Authorise a call to an /api/internal route.
 *
 * Two callers exist. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` on
 * a GET; a manual or worker call may send the media-worker secret in a header
 * instead. Either secret is accepted through either channel.
 *
 * Compared in constant time. A plain `===` or `includes()` returns as soon as a
 * character differs, which in principle lets a caller recover the secret one
 * character at a time from response timings. Remote timing attacks are hard,
 * but the fix costs one function.
 *
 * With no secret configured at all, nothing is authorised: an internal route
 * must never become public because an env var went missing.
 */
export function isInternalRequest(request: Request, secrets = [env.cronSecret, env.mediaWorkerSecret]) {
  const valid = secrets.filter((secret): secret is string => Boolean(secret));
  if (valid.length === 0) return false;

  const auth = request.headers.get("authorization");
  const presented = [
    auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null,
    request.headers.get("x-worker-secret"),
    request.headers.get("x-media-worker-secret"),
  ].filter((value): value is string => Boolean(value));

  return presented.some((candidate) => valid.some((secret) => safeEqual(candidate, secret)));
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on unequal lengths; a length mismatch is simply "no".
  return left.length === right.length && timingSafeEqual(left, right);
}
