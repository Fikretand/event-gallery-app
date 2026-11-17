import { NextResponse } from "next/server";

import { requireAdminPage } from "@/lib/admin-guard";
import { listLeadsForAdmin } from "@/lib/leads";

/** Every lead as CSV (the latest 500 per filter), for a spreadsheet or another tool. Admins only. */
export async function GET(request: Request) {
  await requireAdminPage();
  const status = new URL(request.url).searchParams.get("status") ?? "";
  const leads = await listLeadsForAdmin({ status });

  const cell = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    // Quote everything; a leading = + - @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const sent = (lead: (typeof leads)[number], kind: string) => lead.emails.find((e) => e.kind === kind && e.status === "sent")?.sent_at ?? "";
  const header = [
    "email", "locale", "code", "status", "bought_without_code", "created_at", "expires_at", "source", "medium", "campaign",
    "code_email_sent", "reminder_sent", "last_offer_sent", "unsubscribed_at", "redeemed_at", "redeemed_price_bam", "consent_at",
  ];
  const rows = leads.map((l) =>
    [
      l.email, l.locale, l.code, l.status, l.boughtWithoutCode ? "yes" : "", l.created_at, l.expires_at, l.source, l.medium, l.campaign,
      sent(l, "welcome"), sent(l, "reminder"), sent(l, "final"), l.unsubscribed_at, l.redeemed_at, l.redeemed_price_bam, l.consent_at,
    ]
      .map(cell)
      .join(","),
  );
  const csv = "﻿" + [header.join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="confetti-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
