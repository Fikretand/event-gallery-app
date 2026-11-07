import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => null }));

import { cleanSearchTerm, isStuck } from "./support";

describe("cleanSearchTerm", () => {
  it("keeps what people type and drops PostgREST filter syntax", () => {
    expect(cleanSearchTerm("  ana@gmail.com ")).toBe("ana@gmail.com");
    expect(cleanSearchTerm("vjencanje-ana-i-amar")).toBe("vjencanje-ana-i-amar");
    expect(cleanSearchTerm("x,role.eq.admin)")).toBe("x role.eq.admin");
    expect(cleanSearchTerm("100%*")).toBe("100");
  });
});

describe("isStuck", () => {
  const now = new Date("2026-11-07T12:00:00Z").getTime();
  it("counts only unfinished files older than the cutoff", () => {
    expect(isStuck({ status: "processing", created_at: "2026-11-07T11:30:00Z" }, now)).toBe(true);
    expect(isStuck({ status: "uploaded", created_at: "2026-11-07T11:50:00Z" }, now)).toBe(false);
    expect(isStuck({ status: "ready", created_at: "2026-11-01T00:00:00Z" }, now)).toBe(false);
    expect(isStuck({ status: "failed", created_at: "2026-11-01T00:00:00Z" }, now)).toBe(false);
  });
});
