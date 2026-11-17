import { BRAND_HEX } from "@/lib/brand-colors";
import { daysWord, type Locale } from "@/lib/i18n/index";
import { formatBam } from "@/lib/pricing";
import type { LeadEmailKind } from "@/lib/lead-sequence";

/**
 * The three lead emails, in both languages, as subject + HTML + plain text.
 * Pure: everything they say comes in through `LeadEmailInput`, so a test can
 * read exactly what a person will get (lead-emails.test.ts).
 *
 * Email clients ignore stylesheets and web fonts, so the HTML is a single
 * table with inline styles, Georgia standing in for Playfair Display and the
 * brand hex from brand-colors.ts. Every email carries the code in text (an
 * image can be blocked), the expiry date, and a one-click unsubscribe.
 */

export type LeadEmailInput = {
  locale: Locale;
  code: string;
  /** The offer price the code buys (69 KM). */
  priceBam: number;
  fullPriceBam: number;
  /** The last-offer price (for the final email). */
  finalPriceBam: number;
  expiresAt: string;
  daysLeft: number;
  redeemUrl: string;
  unsubscribeUrl: string;
  siteUrl: string;
};

export type LeadEmail = { subject: string; preheader: string; paragraphs: string[]; cta: string; html: string; text: string };

export function formatEmailDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "bs") {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")}. ${get("month")}. ${get("year")}.`;
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", day: "numeric", month: "long", year: "numeric" }).format(d);
}

type Copy = { subject: string; preheader: string; heading: string; paragraphs: string[]; cta: string };

function copyFor(kind: LeadEmailKind, i: LeadEmailInput): Copy {
  const date = formatEmailDate(i.expiresAt, i.locale);
  const price = formatBam(i.priceBam);
  const full = formatBam(i.fullPriceBam);
  const final = formatBam(i.finalPriceBam);
  const days = `${i.daysLeft} ${daysWord(i.daysLeft, i.locale)}`;
  const extra = formatBam(i.priceBam - i.finalPriceBam);

  if (i.locale === "bs") {
    if (kind === "welcome") {
      return {
        subject: `Vaš kod za popust: ${price} umjesto ${full}`,
        preheader: `Galerija za vaš događaj za ${price}. Kod vrijedi do ${date}`,
        heading: "Evo vašeg koda za popust",
        paragraphs: [
          `Hvala što ste se javili. Uz ovaj kod Confetti galerija za jedan događaj košta ${price} umjesto ${full}.`,
          // A Bosnian date already ends in a full stop (17. 12. 2026.).
          `Kod vrijedi do ${date}`,
          "Gosti skeniraju QR kod i šalju fotografije i videe sa svojih telefona, bez aplikacije, a vi sve imate na jednom mjestu, u punoj kvaliteti.",
          "Dugme ispod otvara Confetti s kodom već upisanim: napravite nalog za svoj događaj i popust je primijenjen pri plaćanju.",
        ],
        cta: "Iskoristi popust",
      };
    }
    if (kind === "reminder") {
      return {
        subject: `Vaš popust još čeka, vrijedi još ${days}`,
        preheader: `Kod ${i.code}: galerija za ${price} umjesto ${full}`,
        heading: "Vaš kod još niste iskoristili",
        paragraphs: [
          `Primijetili smo da kod ${i.code} još nije iskorišten. Uz njega galerija za vaš događaj i dalje košta ${price} umjesto ${full}.`,
          `Kod vrijedi još ${days}, do ${date}`,
          "Galeriju možete napraviti sada, a QR kod podijeliti gostima kad vam odgovara.",
        ],
        cta: "Iskoristi popust",
      };
    }
    return {
      subject: `Još ${days}: dodatnih ${extra} popusta, ${final}`,
      preheader: `Zadnja prilika: galerija za ${final} umjesto ${full}`,
      heading: `Zadnja prilika: ${final}`,
      paragraphs: [
        `Vaš kod ${i.code} ističe za ${days}, ${date}`,
        `Zato spuštamo cijenu za još ${extra}: uz isti kod galerija za vaš događaj sada košta ${final} umjesto ${full}.`,
        "Nakon isteka koda cijena se vraća na redovnu.",
      ],
      cta: `Uzmi za ${final}`,
    };
  }

  if (kind === "welcome") {
    return {
      subject: `Your discount code: ${price} instead of ${full}`,
      preheader: `A gallery for your event for ${price}. The code is valid until ${date}`,
      heading: "Here is your discount code",
      paragraphs: [
        `Thanks for signing up. With this code a Confetti gallery for one event costs ${price} instead of ${full}.`,
        `The code is valid until ${date}.`,
        "Guests scan a QR code and send photos and videos from their phones, no app needed, and you get everything in one place, at full quality.",
        "The button below opens Confetti with the code already filled in: create the account for your event and the discount is applied at checkout.",
      ],
      cta: "Use the discount",
    };
  }
  if (kind === "reminder") {
    return {
      subject: `Your discount is still waiting, ${days} left`,
      preheader: `Code ${i.code}: a gallery for ${price} instead of ${full}`,
      heading: "You haven't used your code yet",
      paragraphs: [
        `We noticed code ${i.code} hasn't been used yet. With it, a gallery for your event still costs ${price} instead of ${full}.`,
        `The code is valid for ${days} more, until ${date}.`,
        "You can set up the gallery now and share the QR code with your guests whenever it suits you.",
      ],
      cta: "Use the discount",
    };
  }
  return {
    subject: `${days} left: an extra ${extra} off, ${final}`,
    preheader: `Last chance: a gallery for ${final} instead of ${full}`,
    heading: `Last chance: ${final}`,
    paragraphs: [
      `Your code ${i.code} expires in ${days}, on ${date}.`,
      `So we are taking another ${extra} off: with the same code a gallery for your event now costs ${final} instead of ${full}.`,
      "Once the code expires, the regular price applies.",
    ],
    cta: `Get it for ${final}`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderLeadEmail(kind: LeadEmailKind, input: LeadEmailInput): LeadEmail {
  const c = copyFor(kind, input);
  const bs = input.locale === "bs";
  const codeLabel = bs ? "Vaš kod" : "Your code";
  const footer = bs
    ? "Ovaj mail ste dobili jer ste ostavili adresu na confetti.ba i pristali na mailove o ovoj ponudi. Šaljemo ih najviše tri."
    : "You are receiving this because you left your address on confetti.ba and agreed to emails about this offer. We send three at most.";
  const unsubscribe = bs ? "Odjava" : "Unsubscribe";
  const replyNote = bs ? "Pitanja? Odgovorite na ovaj mail." : "Questions? Just reply to this email.";

  const h = BRAND_HEX;
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${h.ink};">${escapeHtml(text)}</p>`;

  const html = `<!DOCTYPE html>
<html lang="${input.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${h.paper2};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${h.paper2};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${h.card};border-radius:16px;">
<tr><td style="padding:28px 28px 8px;">
<p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:${h.ink};">Confetti</p>
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:bold;color:${h.ink};">${escapeHtml(c.heading)}</h1>
${c.paragraphs.slice(0, 2).map(p).join("\n")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">
<tr><td align="center" style="background:${h.paper};border:1px dashed ${h.accent};border-radius:12px;padding:16px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${h.muted};">${codeLabel}</p>
<p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:1px;color:${h.ink};">${escapeHtml(input.code)}</p>
</td></tr></table>
${c.paragraphs.slice(2).map(p).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:${h.accentStrong};">
<a href="${escapeHtml(input.redeemUrl)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(c.cta)}</a>
</td></tr></table>
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${h.muted};">${replyNote}</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${h.paper2};">
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${h.muted};">${escapeHtml(footer)}</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${h.muted};">${unsubscribe}</a> &nbsp; <a href="${escapeHtml(input.siteUrl)}" style="color:${h.muted};">confetti.ba</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.slice(0, 2),
    "",
    `${codeLabel}: ${input.code}`,
    "",
    ...c.paragraphs.slice(2),
    "",
    `${c.cta}: ${input.redeemUrl}`,
    "",
    replyNote,
    "",
    "--",
    footer,
    `${unsubscribe}: ${input.unsubscribeUrl}`,
  ].join("\n");

  return { subject: c.subject, preheader: c.preheader, paragraphs: c.paragraphs, cta: c.cta, html, text };
}
