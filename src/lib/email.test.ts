import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return { ...actual, env: { ...actual.env, resendApiKey: "re_test", emailFrom: "Confetti <ponuda@confetti.ba>", emailReplyTo: "podrska@confetti.ba" } };
});

import { sendEmail } from "./email";

const message = { to: "ana@gmail.com", subject: "s", html: "<p>h</p>", text: "t" };
const respond = (status: number, body: unknown) =>
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe("sendEmail", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns Resend's id on success", async () => {
    respond(200, { id: "em_1" });
    expect(await sendEmail(message)).toEqual({ ok: true, id: "em_1" });
  });

  it("calls an unverified domain a setup failure, not the recipient's", async () => {
    respond(403, { name: "validation_error", message: "The confetti.ba domain is not verified." });
    expect(await sendEmail(message)).toMatchObject({ ok: false, setup: true, retryable: false });
  });

  it("retries rate limits and outages, and treats a bad address as final", async () => {
    respond(429, { name: "rate_limit_exceeded", message: "Too many requests" });
    expect(await sendEmail(message)).toMatchObject({ ok: false, setup: false, retryable: true });
    respond(422, { name: "validation_error", message: "Invalid `to` field." });
    expect(await sendEmail(message)).toMatchObject({ ok: false, setup: false, retryable: false });
  });
});
