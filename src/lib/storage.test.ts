import { beforeAll, describe, expect, it } from "vitest";

/**
 * Signed media URLs are the only thing keeping event photographs private, and
 * their shape decides whether a gallery is re-downloaded in full on every
 * page view. Both are worth pinning.
 *
 * No network here: SigV4 presigning is pure computation, so these run against
 * dummy credentials and assert on the URL that comes out.
 */

const ONE_HOUR = 60 * 60;
const WINDOW = 15 * 60;

let createSignedDownloadUrl: typeof import("@/lib/storage").createSignedDownloadUrl;

beforeAll(async () => {
  process.env.R2_ACCOUNT_ID = "acct";
  process.env.R2_ACCESS_KEY_ID = "akid";
  process.env.R2_SECRET_ACCESS_KEY = "secret";
  process.env.R2_BUCKET_NAME = "bucket";
  ({ createSignedDownloadUrl } = await import("@/lib/storage"));
});

describe("createSignedDownloadUrl", () => {
  it("is stable within a window, so the browser can reuse its cached copy", async () => {
    const [a, b] = await Promise.all([
      createSignedDownloadUrl("events/e/guest/x.jpg"),
      createSignedDownloadUrl("events/e/guest/x.jpg"),
    ]);
    expect(a).toBe(b);
  });

  it("signs from a window boundary, never the wall clock", async () => {
    const url = new URL((await createSignedDownloadUrl("events/e/guest/x.jpg"))!);
    const stamp = url.searchParams.get("X-Amz-Date")!;
    // 20260920T171500Z — the minutes must land on a quarter hour.
    const minutes = Number(stamp.slice(11, 13));
    const seconds = Number(stamp.slice(13, 15));
    expect(minutes % 15).toBe(0);
    expect(seconds).toBe(0);
  });

  it("still guarantees an hour of validity to the last URL in a window", async () => {
    const url = new URL((await createSignedDownloadUrl("events/e/guest/x.jpg"))!);
    expect(Number(url.searchParams.get("X-Amz-Expires"))).toBe(ONE_HOUR + WINDOW);
  });

  it("is signed and scoped to one object", async () => {
    const url = new URL((await createSignedDownloadUrl("events/e/guest/x.jpg"))!);
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(url.pathname).toContain("events/e/guest/x.jpg");
  });

  it("sends no parameters beyond those already proven against R2", async () => {
    // The previous signing shape works in production; a stable timestamp is
    // the only change. An unsupported override would break every image.
    const url = new URL((await createSignedDownloadUrl("events/e/guest/x.jpg"))!);
    const params = [...url.searchParams.keys()].sort();
    expect(params).toEqual([
      "X-Amz-Algorithm",
      "X-Amz-Content-Sha256",
      "X-Amz-Credential",
      "X-Amz-Date",
      "X-Amz-Expires",
      "X-Amz-Signature",
      "X-Amz-SignedHeaders",
      "x-amz-checksum-mode",
      "x-id",
    ]);
  });

  it("gives different objects different URLs", async () => {
    const [a, b] = await Promise.all([
      createSignedDownloadUrl("events/e/guest/x.jpg"),
      createSignedDownloadUrl("events/e/guest/y.jpg"),
    ]);
    expect(a).not.toBe(b);
  });

  it("keeps the download filename out of the cacheable preview URL", async () => {
    // A download URL carries Content-Disposition, so it must not collide with
    // the preview URL for the same object.
    const preview = await createSignedDownloadUrl("events/e/guest/x.jpg");
    const download = await createSignedDownloadUrl("events/e/guest/x.jpg", "slika.jpg");
    expect(preview).not.toBe(download);
    expect(download).toContain("response-content-disposition");
  });
});
