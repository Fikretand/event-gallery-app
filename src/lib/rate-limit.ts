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

export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
  persist: (input: { key: string; count: number; windowStart: string }) => Promise<number | null>,
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
      return isRateLimitedInMemory(key, maxRequests, windowMs);
    }

    return count > maxRequests;
  } catch {
    return isRateLimitedInMemory(key, maxRequests, windowMs);
  }
}
