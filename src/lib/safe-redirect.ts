/**
 * Only a path on this site is honoured as a redirect target.
 *
 * `next` in an auth link is the sender's to choose, so "https://…",
 * "//evil.example" and "/\evil.example" (which browsers resolve to another
 * host) all fall back. Otherwise a genuine confirmation link could be rewritten
 * to land on a page that asks for the password again.
 */
export function safeNextPath(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
