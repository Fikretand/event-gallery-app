import {
  PRO_ACTIVE_EVENT_LIMIT,
  PRO_STORAGE_LIMIT_BYTES,
  SOLO_ACTIVE_EVENT_LIMIT,
  SOLO_STORAGE_LIMIT_BYTES,
  TRIAL_DURATION_DAYS,
  TRIAL_PHOTO_LIMIT,
} from "@/lib/constants";
import { getDictionary } from "@/lib/i18n/index";
import { ONE_EVENT_BAM, PLAN_PRICING_BAM, formatBam, yearlyTotalBam } from "@/lib/pricing";
import { localePath, siteUrl } from "@/lib/seo";

/**
 * /llms.txt: a plain summary of Confetti for AI assistants (llmstxt.org).
 *
 * Built from the same dictionaries, prices and limits the site renders, so
 * it cannot drift from the pages. Public facts only: nothing here points at
 * a gallery, an upload page or a dashboard.
 */
export const dynamic = "force-static";

export function GET() {
  const base = siteUrl();
  const en = getDictionary("en");
  const bs = getDictionary("bs");
  const url = (locale: "en" | "bs", path: string) => `${base}${localePath(locale, path)}`;
  const solo = PLAN_PRICING_BAM.solo;
  const pro = PLAN_PRICING_BAM.pro;
  const gb = (bytes: number) => `${Math.round(bytes / 1024 ** 3)} GB`;

  const eventPages = en.content.eventTypes
    .map((type) => `- [${type.name}](${url("en", `/dogadjaji/${type.slug}`)}): ${type.seoDescription}`)
    .join("\n");

  const body = `# Confetti

> ${en.seo.home.description}

Confetti (www.confetti.ba) is a private event gallery made in Bosnia and Herzegovina. The host puts one QR code on the tables; guests scan it with their phone camera and send photos and videos straight from the browser – no app and no account. Every upload arrives hidden, the host approves what stays, and shares the finished gallery privately, optionally behind a PIN. Galleries are never public and never listed by search engines. It works for weddings, birthdays, graduation balls, company parties and conferences. The site is in Bosnian (primary) and English.

Bosnian: ${bs.seo.home.description}

## How it works

- The host creates an event and prints its QR code (table cards and posters are made in the dashboard).
- Guests scan the code and send photos and videos from any phone browser; they can also record a short video message for the hosts.
- Uploads wait hidden until the host approves them; the host can hide, delete and sort them into sections.
- The host shares a private link to the gallery (optional PIN); everyone can download the photos in full quality, also as a ZIP.
- A live slideshow can show approved photos on a screen at the venue.

## Pricing (BAM, convertible marks)

- One Event: ${formatBam(ONE_EVENT_BAM)}, paid once, for couples and hosts. Includes: ${en.marketing.couplePlan.features.join("; ")}.
- Solo (photographers): ${formatBam(solo.monthly)} per month, or ${formatBam(solo.yearly)} per month billed yearly (${formatBam(yearlyTotalBam("solo"))} a year). Up to ${SOLO_ACTIVE_EVENT_LIMIT} active events and ${gb(SOLO_STORAGE_LIMIT_BYTES)} of storage.
- Pro (photographers): ${formatBam(pro.monthly)} per month, or ${formatBam(pro.yearly)} per month billed yearly (${formatBam(yearlyTotalBam("pro"))} a year). Up to ${PRO_ACTIVE_EVENT_LIMIT} active events and ${gb(PRO_STORAGE_LIMIT_BYTES)} of storage. Everything else is the same as Solo.
- Free to start: ${TRIAL_DURATION_DAYS} days or ${TRIAL_PHOTO_LIMIT} photos, whichever comes first, no card needed.

## Main pages

- [Home in Bosnian](${url("bs", "/")}) and [in English](${url("en", "/")})
- [How it works](${url("en", "/kako-funkcionise")})
- [Pricing](${url("en", "/pricing")})
- [For photographers](${url("en", "/for-photographers")})
- [For couples and hosts](${url("en", "/for-couples")})
- [Questions and answers](${url("en", "/pitanja")})
- [How private a gallery really is](${url("en", "/privatnost-i-sigurnost")})

## Event types

${eventPages}

## Contact

- Support: podrska@confetti.ba
- Privacy policy: ${url("en", "/privacy")}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
