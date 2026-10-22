/**
 * Scheduling for the upload dropzone: a small worker pool and a retry wrapper
 * that waits out a dropped connection instead of failing the file.
 *
 * Guests send from a venue's Wi-Fi or a crowded 4G cell, where a connection
 * blinks out for a few seconds at a time. A file that hits that should pause
 * and carry on, not land in "Failed" for the guest to notice and resend.
 *
 * Pure and environment-free (no window, no XHR) so it runs under vitest; the
 * component passes in the browser bits.
 */

/** Raised for failures worth another attempt: a dropped connection, a stalled transfer, a 5xx. */
export class RetryableUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableUploadError";
  }
}

export function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

/** Concurrent uploads: fewer on a phone, which shares one weak radio. */
export function uploadConcurrency(isTouchDevice: boolean) {
  return isTouchDevice ? 3 : 5;
}

/**
 * Run `worker` over `items`, at most `limit` at a time, in order of start.
 * Never rejects: each worker is expected to record its own outcome.
 */
export async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      try {
        await worker(items[index], index);
      } catch {
        // The worker reports its own failure; one file must not stop the others.
      }
    }
  });
  await Promise.all(lanes);
}

export type RetryOptions = {
  /** Total attempts, including the first. */
  attempts: number;
  /** Pause before attempt 2, 3, … (the last value repeats). */
  delaysMs: number[];
  /** Resolves once the device is online again; called before every retry. */
  waitForOnline: () => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  /** Told when a retry is about to happen, so the UI can say so. */
  onRetry?: (attempt: number, error: unknown) => void;
};

/**
 * Call `task` until it succeeds, an error is not retryable, or the attempts run
 * out. Time spent offline does not use up attempts: the wait for the connection
 * happens before each retry, on top of the backoff.
 */
export async function withRetry<T>(task: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof RetryableUploadError || error instanceof TypeError;
      if (!retryable || attempt === options.attempts) break;
      options.onRetry?.(attempt + 1, error);
      await options.waitForOnline();
      const delay = options.delaysMs[Math.min(attempt - 1, options.delaysMs.length - 1)] ?? 0;
      await options.sleep(delay);
    }
  }
  throw lastError;
}
