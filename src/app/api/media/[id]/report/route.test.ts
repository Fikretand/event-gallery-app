import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMediaById: vi.fn(),
  canViewGallery: vi.fn(),
  counter: 0,
  recordMediaReport: vi.fn(),
  clearMediaReports: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock("@/lib/events", () => ({
  getMediaById: mocks.getMediaById,
  canViewGallery: mocks.canViewGallery,
  incrementRateLimitCount: async () => ++mocks.counter,
}));
vi.mock("@/lib/media-reports", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media-reports")>()),
  recordMediaReport: mocks.recordMediaReport,
  clearMediaReports: mocks.clearMediaReports,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }),
}));

import { DELETE, POST } from "@/app/api/media/[id]/report/route";

const shown = {
  id: "m-1",
  event_id: "ev-1",
  hidden_at: null,
  deleted_at: null,
  event: { id: "ev-1", owner_user_id: "owner-1", status: "active", event_settings: {} },
};

const params = { params: Promise.resolve({ id: "m-1" }) };
const report = (body: unknown = { reason: "private" }) =>
  POST(new Request("http://localhost/api/media/m-1/report", { method: "POST", body: JSON.stringify(body) }), params);

describe("POST /api/media/[id]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.counter = 0;
    mocks.getMediaById.mockResolvedValue(shown);
    mocks.canViewGallery.mockResolvedValue(true);
    mocks.recordMediaReport.mockResolvedValue(undefined);
  });

  it("records a report on a file the visitor can see", async () => {
    const response = await report();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.recordMediaReport).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: "m-1", eventId: "ev-1", reason: "private" }),
    );
  });

  it("keeps an unknown reason out of the table", async () => {
    await report({ reason: "<script>" });
    expect(mocks.recordMediaReport).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  it("answers 404 for a file the gallery does not show", async () => {
    mocks.getMediaById.mockResolvedValue({ ...shown, hidden_at: "2026-10-22T00:00:00Z" });
    expect((await report()).status).toBe(404);
    mocks.getMediaById.mockResolvedValue({ ...shown, deleted_at: "2026-10-22T00:00:00Z" });
    expect((await report()).status).toBe(404);
    expect(mocks.recordMediaReport).not.toHaveBeenCalled();
  });

  it("answers 404 without access to the gallery (PIN, expired)", async () => {
    mocks.canViewGallery.mockResolvedValue(false);
    expect((await report()).status).toBe(404);
    expect(mocks.recordMediaReport).not.toHaveBeenCalled();
  });

  it("stops an address after 10 reports in the window", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) statuses.push((await report()).status);
    expect(statuses.slice(0, 10).every((status) => status === 200)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});

describe("DELETE /api/media/[id]/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMediaById.mockResolvedValue(shown);
    mocks.clearMediaReports.mockResolvedValue(undefined);
  });

  const dismiss = () => DELETE(new Request("http://localhost/api/media/m-1/report", { method: "DELETE" }), params);

  it("lets only the owner dismiss reports", async () => {
    mocks.user = null;
    expect((await dismiss()).status).toBe(401);
    mocks.user = { id: "someone-else" };
    expect((await dismiss()).status).toBe(403);
    expect(mocks.clearMediaReports).not.toHaveBeenCalled();

    mocks.user = { id: "owner-1" };
    expect((await dismiss()).status).toBe(200);
    expect(mocks.clearMediaReports).toHaveBeenCalledWith("m-1");
  });
});
