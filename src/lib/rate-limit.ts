type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function isRateLimitedInMemory(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }

  current.count += 1;
  buckets.set(key, current);
  return current.count > maxRequests;
}

/**
 * `failClosed`: when the shared counter cannot be read, refuse instead of
 * falling back to this instance's memory. For the gallery PIN, where the limit
 * is the only thing between a guesser and a 4-digit PIN, and a per-instance
 * count on serverless barely counts.
 */
export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
  persist: (input: { key: string; count: number; windowStart: string }) => Promise<number | null>,
  { failClosed = false }: { failClosed?: boolean } = {},
) {
  const now = Date.now();
  const windowStart = new Date(now - (now % windowMs)).toISOString();

  try {
    const count = await persist({
      key,
      count: 1,
      windowStart,
    });

    if (count === null) {
      return failClosed || isRateLimitedInMemory(key, maxRequests, windowMs);
    }

    return count > maxRequests;
  } catch {
    return failClosed || isRateLimitedInMemory(key, maxRequests, windowMs);
  }
}
