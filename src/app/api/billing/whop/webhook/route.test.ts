import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { SECRET } = vi.hoisted(() => ({
  SECRET: "ws_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
}));

const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  updates: [] as { id: string; update: Record<string, unknown> }[],
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      whopApiKey: "apik_test",
      whopWebhookSecret: SECRET,
      whopEnvironment: "sandbox",
      whopPlanOneEvent: "plan_one",
      whopPlanSoloMonthly: "plan_solo_m",
      whopPlanSoloYearly: "plan_solo_y",
      whopPlanProMonthly: "plan_pro_m",
      whopPlanProYearly: "plan_pro_y",
    },
  };
});

/** Just enough of the Supabase query builder for the webhook's two calls. */
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: async () => ({ data: mocks.rows.find((row) => row[column] === value) ?? null }),
        }),
      }),
      update: (update: Record<string, unknown>) => ({
        eq: async (_column: string, id: string) => {
          mocks.updates.push({ id, update });
          return { error: null };
        },
      }),
    }),
  }),
}));

import { POST } from "@/app/api/billing/whop/webhook/route";

function deliver(type: string, data: unknown, opts: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify({ id: "msg_1", type, api_version: "v1", data });
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(opts.secret ?? SECRET, "utf8"))
    .update(`msg_1.${timestamp}.${body}`)
    .digest("base64");
  return POST(
    new Request("http://localhost/api/billing/whop/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "msg_1",
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${signature}`,
      },
      body,
    }),
  );
}

const photographer = {
  id: "user-p",
  email: "foto@example.com",
  account_type: "photographer",
  subscription_event_at: null,
  subscription_external_id: null,
};
const couple = { ...photographer, id: "user-c", email: "par@example.com", account_type: "couple" };

const payment = (overrides: Record<string, unknown> = {}) => ({
  id: "pay_1",
  status: "paid",
  substatus: "succeeded",
  metadata: { userId: "user-p" },
  membership_id: "mem_1",
  variant_id: "plan_pro_y",
  customer_email: "someone-else@example.com",
  paid_at: "2026-11-05T10:00:00.000Z",
  updated_at: "2026-11-05T10:00:00.000Z",
  ...overrides,
});

describe("POST /api/billing/whop/webhook", () => {
  beforeEach(() => {
    mocks.rows = [{ ...photographer }, { ...couple }];
    mocks.updates = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuses a delivery signed with another secret", async () => {
    const response = await deliver("payment.succeeded", payment(), { secret: "ws_wrong" });
    expect(response.status).toBe(403);
    expect(mocks.updates).toHaveLength(0);
  });

  it("refuses a replay outside the five-minute window", async () => {
    const response = await deliver("payment.succeeded", payment(), {
      timestamp: Math.floor(Date.now() / 1000) - 600,
    });
    expect(response.status).toBe(403);
  });

  it("activates the account named in metadata, not the payer's email", async () => {
    const response = await deliver("payment.succeeded", payment());
    expect(response.status).toBe(200);
    expect(mocks.updates).toEqual([
      {
        id: "user-p",
        update: {
          subscription_provider: "whop",
          subscription_external_id: "mem_1",
          subscription_status: "active",
          subscription_event_at: "2026-11-05T10:00:00.000Z",
          plan_tier: "pro",
        },
      },
    ]);
  });

  it("falls back to the payment email when metadata is missing", async () => {
    await deliver("payment.succeeded", payment({ metadata: null, customer_email: "Foto@Example.com" }));
    expect(mocks.updates[0]?.id).toBe("user-p");
  });

  it("never grants a photographer plan for a One Event payment", async () => {
    const response = await deliver("payment.succeeded", payment({ variant_id: "plan_one" }));
    expect(await response.json()).toMatchObject({ note: "plan does not fit account" });
    expect(mocks.updates).toHaveLength(0);
  });

  it("ignores a plan Confetti does not sell", async () => {
    await deliver("payment.succeeded", payment({ variant_id: "plan_unknown" }));
    expect(mocks.updates).toHaveLength(0);
  });

  it("stores the renewal date of an active subscription", async () => {
    await deliver("membership.activated", {
      id: "mem_1",
      status: "active",
      metadata: { userId: "user-p" },
      variant_id: "plan_solo_m",
      cancel_at_period_end: false,
      current_period_end: "2026-12-05T10:00:00.000Z",
      updated_at: "2026-11-05T10:00:01.000Z",
    });
    expect(mocks.updates[0]?.update).toMatchObject({
      subscription_status: "active",
      subscription_renews_at: "2026-12-05T10:00:00.000Z",
      plan_tier: "solo",
    });
  });

  it("keeps access but drops the renewal date once cancel-at-period-end is set", async () => {
    await deliver("membership.cancel_at_period_end_changed", {
      id: "mem_1",
      status: "active",
      metadata: { userId: "user-p" },
      variant_id: "plan_solo_m",
      cancel_at_period_end: true,
      current_period_end: "2026-12-05T10:00:00.000Z",
      updated_at: "2026-11-06T10:00:00.000Z",
    });
    expect(mocks.updates[0]?.update).toMatchObject({ subscription_status: "active", subscription_renews_at: null });
  });

  it("ends the plan when the membership is deactivated", async () => {
    await deliver("membership.deactivated", {
      id: "mem_1",
      status: "expired",
      metadata: { userId: "user-p" },
      variant_id: "plan_solo_m",
      updated_at: "2026-12-05T10:00:00.000Z",
    });
    expect(mocks.updates[0]?.update).toMatchObject({ subscription_status: "canceled", subscription_renews_at: null });
    expect(mocks.updates[0]?.update).not.toHaveProperty("plan_tier");
  });

  it("does not let an older event undo a newer one", async () => {
    mocks.rows[0] = { ...photographer, subscription_event_at: "2026-11-06T00:00:00.000Z", subscription_external_id: "mem_1" };
    const response = await deliver("payment.succeeded", payment());
    expect(await response.json()).toMatchObject({ note: "stale" });
    expect(mocks.updates).toHaveLength(0);
  });

  it("leaves a One Event membership alone when it stops being active", async () => {
    const response = await deliver("membership.deactivated", {
      id: "mem_2",
      status: "completed",
      metadata: { userId: "user-c" },
      variant_id: "plan_one",
      updated_at: "2026-11-06T00:00:00.000Z",
    });
    expect(await response.json()).toMatchObject({ note: "one-time membership change ignored" });
    expect(mocks.updates).toHaveLength(0);
  });

  it("cancels the purchase a succeeded refund belongs to", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(payment({ metadata: { userId: "user-c" }, membership_id: "mem_2", variant_id: "plan_one", substatus: "refunded" })),
    );
    vi.stubGlobal("fetch", fetchMock);
    await deliver("refund.updated", {
      id: "rf_1",
      status: "succeeded",
      payment_id: "pay_1",
      updated_at: "2026-11-07T00:00:00.000Z",
    });
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("https://sandbox-api.whop.com/api/v1/payments/pay_1");
    expect(mocks.updates).toEqual([
      {
        id: "user-c",
        update: {
          subscription_provider: "whop",
          subscription_external_id: "mem_2",
          subscription_status: "canceled",
          subscription_renews_at: null,
          subscription_event_at: "2026-11-07T00:00:00.000Z",
        },
      },
    ]);
  });

  it("waits for a pending refund and ignores a partial one", async () => {
    await deliver("refund.created", { id: "rf_1", status: "pending", payment_id: "pay_1" });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(payment({ substatus: "partially_refunded" }))));
    await deliver("refund.updated", { id: "rf_1", status: "succeeded", payment_id: "pay_1" });
    expect(mocks.updates).toHaveLength(0);
  });

  it("acknowledges events it does not act on", async () => {
    const response = await deliver("product.updated", { id: "prod_1" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ note: "ignored" });
  });
});
