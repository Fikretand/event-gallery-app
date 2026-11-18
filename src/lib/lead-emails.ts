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

/**
 * Who the address belongs to at send time, so the email can say what to do:
 * - "none": no account yet; make a one-event account with this address.
 * - "couple": a one-event account that has not paid; sign in and pay.
 * - "photographer": a photographer account; One Event needs its own account.
 * - "paid": a one-event account that already paid; the code is for another event.
 */
export type LeadAccount = "none" | "couple" | "photographer" | "paid";

export type LeadEmailInput = {
  locale: Locale;
  code: string;
  /** The address the email goes to (the account must use it to apply the code on its own). */
  email: string;
  account: LeadAccount;
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

export type LeadEmail = { subject: string; preheader: string; paragraphs: string[]; steps: string[]; cta: string; html: string; text: string };

export function formatEmailDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (locale === "bs") {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")}. ${get("month")}. ${get("year")}.`;
  }
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sarajevo", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/**
 * `before` sits above the code box, `steps` are "how to use it" as a numbered
 * list, `after` closes. Every number and date is filled in here.
 */
type Copy = { subject: string; preheader: string; heading: string; before: string[]; steps: string[]; after: string[]; cta: string; footer: string };

/** The how-to for each kind of account, in both languages. */
type HowTo = { intro: string; steps: string[]; cta: string; short: string; otherAddress?: string };

function howTo(i: LeadEmailInput, price: string): HowTo {
  const bs = i.locale === "bs";
  switch (i.account) {
    case "couple":
      return {
        intro: bs
          ? `Na adresi ${i.email} već imate Confetti nalog, pa vam ne treba novi: popust se primjenjuje na njega.`
          : `You already have a Confetti account at ${i.email}, so there is no need for a new one: the discount applies to it.`,
        steps: bs
          ? [
              `Kliknite dugme ispod i prijavite se svojim nalogom (${i.email}).`,
              `Otvoriće se stranica Plaćanje s popustom već primijenjenim: ${price}.`,
              "Platite karticom i paket je odmah aktivan.",
            ]
          : [
              `Click the button below and sign in to your account (${i.email}).`,
              `The Payment page opens with the discount already applied: ${price}.`,
              "Pay by card and the plan is active at once.",
            ],
        cta: bs ? "Prijavi se i iskoristi popust" : "Sign in and use the discount",
        short: bs
          ? `Prijavite se svojim nalogom (${i.email}): na stranici Plaćanje popust je već primijenjen.`
          : `Sign in to your account (${i.email}): the discount is already applied on the Payment page.`,
      };
    case "photographer":
      return {
        intro: bs
          ? `Na adresi ${i.email} imate nalog za fotografe. Ovaj kod vrijedi za paket Jedan događaj, koji ide na poseban nalog za jedan događaj.`
          : `The account at ${i.email} is a photographer account. This code is for the One Event plan, which comes with its own one-event account.`,
        steps: bs
          ? [
              "Kliknite dugme ispod i napravite nalog za jedan događaj s nekom drugom email adresom (jedna adresa može imati samo jedan nalog).",
              `Na stranici Plaćanje, u polje „Imate kod za popust?“, upišite ${i.code}.`,
              `Platite ${price} karticom i paket je odmah aktivan.`,
            ]
          : [
              "Click the button below and create a one-event account with another email address (one address holds one account).",
              `On the Payment page, enter ${i.code} in “Have a discount code?”.`,
              `Pay ${price} by card and the plan is active at once.`,
            ],
        cta: bs ? "Napravi nalog za događaj" : "Create an event account",
        short: bs
          ? `Kod upišite na stranici Plaćanje naloga za jedan događaj (vaš nalog na ${i.email} je za fotografe).`
          : `Enter the code on the Payment page of a one-event account (your account at ${i.email} is a photographer account).`,
      };
    case "paid":
      return {
        intro: bs
          ? `Vaš nalog na adresi ${i.email} već ima plaćen paket, pa vam za njega kod ne treba. Ako planirate još jedan događaj, kod možete iskoristiti na novom nalogu.`
          : `Your account at ${i.email} already has a paid plan, so it does not need the code. If you are planning another event, you can use it on a new account.`,
        steps: bs
          ? [
              "Kliknite dugme ispod i napravite nalog za jedan događaj s nekom drugom email adresom.",
              `Na stranici Plaćanje, u polje „Imate kod za popust?“, upišite ${i.code}.`,
              `Platite ${price} karticom i paket je odmah aktivan.`,
            ]
          : [
              "Click the button below and create a one-event account with another email address.",
              `On the Payment page, enter ${i.code} in “Have a discount code?”.`,
              `Pay ${price} by card and the plan is active at once.`,
            ],
        cta: bs ? "Napravi nalog za novi događaj" : "Create an account for another event",
        short: bs
          ? "Kod vrijedi na novom nalogu za jedan događaj: upišite ga na stranici Plaćanje."
          : "The code works on a new one-event account: enter it on the Payment page.",
      };
    default:
      return {
        intro: "",
        steps: bs
          ? [
              `Kliknite dugme ispod i napravite nalog za svoj događaj s adresom ${i.email}, istom na koju vam je stigao ovaj mail.`,
              `Nakon registracije otvara se stranica Plaćanje s popustom već primijenjenim: ${price}.`,
              "Platite karticom i galerija je odmah otvorena.",
            ]
          : [
              `Click the button below and create the account for your event with ${i.email}, the address this email came to.`,
              `After signing up, the Payment page opens with the discount already applied: ${price}.`,
              "Pay by card and the gallery is open at once.",
            ],
        cta: bs ? "Napravi nalog i iskoristi popust" : "Create an account and use the discount",
        short: bs
          ? `Napravite nalog s adresom ${i.email} i popust je na stranici Plaćanje već primijenjen.`
          : `Create an account with ${i.email} and the discount is already applied on the Payment page.`,
        otherAddress: bs
          ? `Ako nalog napravite s drugom adresom, upišite kod ${i.code} na stranici Plaćanje, u polje „Imate kod za popust?“.`
          : `If you sign up with a different address, enter ${i.code} on the Payment page, in “Have a discount code?”.`,
      };
  }
}

function copyFor(kind: LeadEmailKind, i: LeadEmailInput): Copy {
  const date = formatEmailDate(i.expiresAt, i.locale);
  const price = formatBam(i.priceBam);
  const full = formatBam(i.fullPriceBam);
  const final = formatBam(i.finalPriceBam);
  const days = `${i.daysLeft} ${daysWord(i.daysLeft, i.locale)}`;
  const extra = formatBam(i.priceBam - i.finalPriceBam);
  const off = formatBam(i.fullPriceBam - i.priceBam);
  const bs = i.locale === "bs";
  const instead = bs ? "umjesto" : "instead of";
  const how = howTo(i, `${kind === "final" ? final : price} ${instead} ${full}`);
  const otherAddress = how.otherAddress ? [how.otherAddress] : [];
  const leadFooter = bs
    ? "Ovaj mail ste dobili jer ste ostavili adresu na confetti.ba i pristali na mailove o ovoj ponudi. Šaljemo ih najviše tri."
    : "You are receiving this because you left your address on confetti.ba and agreed to emails about this offer. We send three at most.";

  if (kind === "trial") {
    // Always a one-event account that has not paid: that is who gets it.
    return bs
      ? {
          subject: `Probni period je završio: ${price} umjesto ${full}, još ${days}`,
          preheader: `${off} manje na paket Jedan događaj, do ${date}`,
          heading: `${off} manje ako odlučite u ${days}`,
          before: [
            `Vaš probni period na Confettiju je završio. Ako želite zadržati galeriju i primati fotografije gostiju bez ograničenja, paket Jedan događaj za vas sada košta ${price} umjesto ${full}.`,
            `Popust vrijedi do ${date}`,
          ],
          steps: [
            `Kliknite dugme ispod i prijavite se svojim nalogom (${i.email}).`,
            `Na stranici Plaćanje popust je već primijenjen: ${price} umjesto ${full}.`,
            "Platite karticom i paket je odmah aktivan, s galerijom i svim fotografijama koje već imate.",
          ],
          after: ["Nakon isteka popusta cijena se vraća na redovnu."],
          cta: "Prijavi se i iskoristi popust",
          footer: "Ovaj mail ste dobili jer imate Confetti nalog na ovoj adresi, a probni period je završio. Šaljemo ga samo jednom.",
        }
      : {
          subject: `Your trial has ended: ${price} instead of ${full}, ${days} left`,
          preheader: `${off} off the One Event plan, until ${date}`,
          heading: `${off} off if you decide within ${days}`,
          before: [
            `Your Confetti trial has ended. If you want to keep the gallery and receive your guests' photos without limits, the One Event plan now costs you ${price} instead of ${full}.`,
            `The discount is valid until ${date}.`,
          ],
          steps: [
            `Click the button below and sign in to your account (${i.email}).`,
            `The discount is already applied on the Payment page: ${price} instead of ${full}.`,
            "Pay by card and the plan is active at once, with your gallery and every photo already in it.",
          ],
          after: ["Once the discount ends, the regular price applies."],
          cta: "Sign in and use the discount",
          footer: "You are receiving this because you have a Confetti account at this address and its trial has ended. We send it once.",
        };
  }

  if (bs) {
    if (kind === "welcome") {
      return {
        subject: `Vaš kod za popust: ${price} umjesto ${full}`,
        preheader: `Galerija za vaš događaj za ${price}. Kod vrijedi do ${date}`,
        heading: "Evo vašeg koda za popust",
        before: [
          `Hvala što ste se javili. Uz ovaj kod Confetti galerija za jedan događaj košta ${price} umjesto ${full}.`,
          // A Bosnian date already ends in a full stop (17. 12. 2026.).
          `Kod vrijedi do ${date}`,
          ...(how.intro ? [how.intro] : []),
        ],
        steps: how.steps,
        after: [
          ...otherAddress,
          "Gosti skeniraju QR kod i šalju fotografije i videe sa svojih telefona, bez aplikacije, a vi sve imate na jednom mjestu, u punoj kvaliteti.",
        ],
        cta: how.cta,
        footer: leadFooter,
      };
    }
    if (kind === "reminder") {
      return {
        subject: `Vaš popust još čeka, vrijedi još ${days}`,
        preheader: `Kod ${i.code}: galerija za ${price} umjesto ${full}`,
        heading: "Vaš kod još niste iskoristili",
        before: [
          `Primijetili smo da kod ${i.code} još nije iskorišten. Uz njega galerija za vaš događaj i dalje košta ${price} umjesto ${full}.`,
          `Kod vrijedi još ${days}, do ${date}`,
        ],
        steps: [],
        after: [how.short, "Galeriju možete napraviti sada, a QR kod podijeliti gostima kad vam odgovara."],
        cta: how.cta,
        footer: leadFooter,
      };
    }
    return {
      subject: `Još ${days}: dodatnih ${extra} popusta, ${final}`,
      preheader: `Zadnja prilika: galerija za ${final} umjesto ${full}`,
      heading: `Zadnja prilika: ${final}`,
      before: [
        `Vaš kod ${i.code} ističe za ${days}, ${date}`,
        `Zato spuštamo cijenu za još ${extra}: uz isti kod galerija za vaš događaj sada košta ${final} umjesto ${full}.`,
      ],
      steps: [],
      after: [how.short, "Nakon isteka koda cijena se vraća na redovnu."],
      cta: `Uzmi za ${final}`,
      footer: leadFooter,
    };
  }

  if (kind === "welcome") {
    return {
      subject: `Your discount code: ${price} instead of ${full}`,
      preheader: `A gallery for your event for ${price}. The code is valid until ${date}`,
      heading: "Here is your discount code",
      before: [
        `Thanks for signing up. With this code a Confetti gallery for one event costs ${price} instead of ${full}.`,
        `The code is valid until ${date}.`,
        ...(how.intro ? [how.intro] : []),
      ],
      steps: how.steps,
      after: [
        ...otherAddress,
        "Guests scan a QR code and send photos and videos from their phones, no app needed, and you get everything in one place, at full quality.",
      ],
      cta: how.cta,
      footer: leadFooter,
    };
  }
  if (kind === "reminder") {
    return {
      subject: `Your discount is still waiting, ${days} left`,
      preheader: `Code ${i.code}: a gallery for ${price} instead of ${full}`,
      heading: "You haven't used your code yet",
      before: [
        `We noticed code ${i.code} hasn't been used yet. With it, a gallery for your event still costs ${price} instead of ${full}.`,
        `The code is valid for ${days} more, until ${date}.`,
      ],
      steps: [],
      after: [how.short, "You can set up the gallery now and share the QR code with your guests whenever it suits you."],
      cta: how.cta,
      footer: leadFooter,
    };
  }
  return {
    subject: `${days} left: an extra ${extra} off, ${final}`,
    preheader: `Last chance: a gallery for ${final} instead of ${full}`,
    heading: `Last chance: ${final}`,
    before: [
      `Your code ${i.code} expires in ${days}, on ${date}.`,
      `So we are taking another ${extra} off: with the same code a gallery for your event now costs ${final} instead of ${full}.`,
    ],
    steps: [],
    after: [how.short, "Once the code expires, the regular price applies."],
    cta: `Get it for ${final}`,
    footer: leadFooter,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Escaped, with a price kept on one line ("69 KM" never breaks before "KM"). */
function htmlText(value: string): string {
  return escapeHtml(value).replace(/(\d) KM/g, "$1&nbsp;KM");
}

export function renderLeadEmail(kind: LeadEmailKind, input: LeadEmailInput): LeadEmail {
  const c = copyFor(kind, input);
  const bs = input.locale === "bs";
  const codeLabel = bs ? "Vaš kod" : "Your code";
  const stepsLabel = bs ? "Kako iskoristiti popust" : "How to use it";
  const unsubscribe = bs ? "Odjava" : "Unsubscribe";
  const replyNote = bs ? "Pitanja? Odgovorite na ovaj mail." : "Questions? Just reply to this email.";

  const h = BRAND_HEX;
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${h.ink};">${htmlText(text)}</p>`;
  // A table, not <ol>: list markers and padding differ in every mail client.
  const steps = c.steps.length
    ? `<p style="margin:4px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${h.ink};">${stepsLabel}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
${c.steps
  .map(
    (step, n) => `<tr><td valign="top" style="padding:0 12px 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1.55;color:${h.accentStrong};">${n + 1}.</td><td valign="top" style="padding:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:${h.ink};">${htmlText(step)}</td></tr>`,
  )
  .join("\n")}
</table>`
    : "";

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
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;font-weight:bold;color:${h.ink};">${htmlText(c.heading)}</h1>
${c.before.map(p).join("\n")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;">
<tr><td align="center" style="background:${h.paper};border:1px dashed ${h.accent};border-radius:12px;padding:16px;">
<p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${h.muted};">${codeLabel}</p>
<p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:bold;letter-spacing:1px;color:${h.ink};">${escapeHtml(input.code)}</p>
</td></tr></table>
${steps}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;"><tr><td style="border-radius:999px;background:${h.accentStrong};">
<a href="${escapeHtml(input.redeemUrl)}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(c.cta)}</a>
</td></tr></table>
${c.after.map(p).join("\n")}
<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${h.muted};">${replyNote}</p>
</td></tr>
<tr><td style="padding:16px 28px 24px;border-top:1px solid ${h.paper2};">
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${h.muted};">${escapeHtml(c.footer)}</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;"><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${h.muted};">${unsubscribe}</a> &nbsp; <a href="${escapeHtml(input.siteUrl)}" style="color:${h.muted};">confetti.ba</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    c.heading,
    "",
    ...c.before,
    "",
    `${codeLabel}: ${input.code}`,
    "",
    ...(c.steps.length ? [`${stepsLabel}:`, ...c.steps.map((step, n) => `${n + 1}. ${step}`), ""] : []),
    `${c.cta}: ${input.redeemUrl}`,
    "",
    ...c.after,
    "",
    replyNote,
    "",
    "--",
    c.footer,
    `${unsubscribe}: ${input.unsubscribeUrl}`,
  ].join("\n");

  const paragraphs = [...c.before, ...c.after];
  return { subject: c.subject, preheader: c.preheader, paragraphs, steps: c.steps, cta: c.cta, html, text };
}
