import { env } from "@/lib/env";

/**
 * Sending email through Resend's REST API (plain fetch, no SDK), the same way
 * the app talks to Whop. Used by the lead offer (src/lib/leads.ts) only;
 * Supabase still sends the account emails itself.
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  /** Resend tag (letters, digits, _ and - only), to filter its dashboard. */
  tag?: string;
  /** Same key, same email: Resend sends it once even if we ask twice within 24 h. */
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string; retryable: boolean };

export async function sendEmail(message: OutgoingEmail): Promise<SendResult> {
  if (!env.resendApiKey) return { ok: false, error: "RESEND_API_KEY is not set.", retryable: true };

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [message.to],
        reply_to: env.emailReplyTo,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
        tags: message.tag ? [{ name: "kind", value: message.tag }] : undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (cause) {
    return { ok: false, error: `Network: ${cause instanceof Error ? cause.message : String(cause)}`, retryable: true };
  }

  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (response.ok && body.id) return { ok: true, id: body.id };
  const error = `${response.status} ${body.name ?? ""} ${body.message ?? ""}`.trim().slice(0, 900);
  // 4xx other than rate limits means the request itself is wrong (bad address,
  // unverified domain); trying again tomorrow will not fix it.
  const retryable = response.status === 429 || response.status >= 500;
  return { ok: false, error, retryable };
}
