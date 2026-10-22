/**
 * Only a path on this site is honoured as a redirect target.
 *
 * `next` in an auth link is the sender's to choose, so "https://…",
 * "//evil.example" and "/\evil.example" (which browsers resolve to another
 * host) all fall back. Otherwise a genuine confirmation link could be rewritten
 * to land on a page that asks for the password again.
 *
 * Browsers drop tabs and newlines inside a URL, so "/\t/evil.example" becomes
 * "//evil.example"; control characters are refused outright, and the result is
 * resolved against a placeholder origin as a last check that it stays on it.
 */
export function safeNextPath(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f\\]/.test(next)) {
    return fallback;
  }
  try {
    const base = "https://confetti.invalid";
    if (new URL(next, base).origin !== base) return fallback;
  } catch {
    return fallback;
  }
  return next;
}
