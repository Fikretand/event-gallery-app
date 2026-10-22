import { describe, expect, it } from "vitest";

import { RetryableUploadError, isRetryableStatus, runPool, uploadConcurrency, withRetry } from "./upload-queue";

const noWait = { waitForOnline: async () => {}, sleep: async () => {} };

describe("runPool", () => {
  it("never runs more than the limit at once and finishes every item", async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      done.push(n);
    });
    expect(peak).toBe(3);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps going when one item fails", async () => {
    const done: number[] = [];
    await runPool([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      done.push(n);
    });
    expect(done.sort()).toEqual([1, 3]);
  });

  it("handles an empty list", async () => {
    await expect(runPool([], 3, async () => {})).resolves.toBeUndefined();
  });
});

describe("withRetry", () => {
  it("retries a dropped connection and succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new RetryableUploadError("network");
        return "ok";
      },
      { attempts: 4, delaysMs: [1], ...noWait },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("treats fetch's TypeError as a dropped connection", async () => {
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw new TypeError("Failed to fetch");
      },
      { attempts: 2, delaysMs: [1], ...noWait },
    );
    expect(calls).toBe(2);
  });

  it("does not retry a refusal", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error("403 forbidden");
        },
        { attempts: 4, delaysMs: [1], ...noWait },
      ),
    ).rejects.toThrow("403");
    expect(calls).toBe(1);
  });

  it("gives up after the last attempt with the last error", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new RetryableUploadError(`fail ${calls}`);
        },
        { attempts: 3, delaysMs: [1], ...noWait },
      ),
    ).rejects.toThrow("fail 3");
    expect(calls).toBe(3);
  });

  it("waits for the connection before every retry and reports it", async () => {
    const events: string[] = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        events.push(`try ${calls}`);
        if (calls < 2) throw new RetryableUploadError("offline");
      },
      {
        attempts: 3,
        delaysMs: [10],
        waitForOnline: async () => {
          events.push("wait online");
        },
        sleep: async (ms) => {
          events.push(`sleep ${ms}`);
        },
        onRetry: (attempt) => events.push(`retry ${attempt}`),
      },
    );
    expect(events).toEqual(["try 1", "retry 2", "wait online", "sleep 10", "try 2"]);
  });
});

describe("helpers", () => {
  it("retries only transient statuses", () => {
    expect([0, 408, 429, 500, 502, 503].every(isRetryableStatus)).toBe(true);
    expect([400, 401, 403, 404, 413].some(isRetryableStatus)).toBe(false);
  });

  it("uses fewer lanes on a phone", () => {
    expect(uploadConcurrency(true)).toBeLessThan(uploadConcurrency(false));
  });
});
