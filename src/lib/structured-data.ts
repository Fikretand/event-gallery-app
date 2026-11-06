import { getDictionary, type Locale } from "@/lib/i18n/index";
import { ONE_EVENT_BAM, PLAN_PRICING_BAM, yearlyTotalBam, type PlanId } from "@/lib/pricing";
import { SITE_NAME, localePath, siteUrl } from "@/lib/seo";

/**
 * schema.org data for search engines and AI assistants: what Confetti is,
 * who runs it, what it costs, and the answers on /pitanja.
 *
 * Every price is read from `pricing.ts`, like everywhere else, so this can
 * never quote a number the checkout will not charge.
 */

const SUPPORT_EMAIL = "podrska@confetti.ba";

type JsonLd = Record<string, unknown>;

function organization(): JsonLd {
  const base = siteUrl();
  return {
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: base,
    email: SUPPORT_EMAIL,
    areaServed: ["BA", "HR", "RS", "ME", "SI", "Europe"],
  };
}

function website(locale: Locale): JsonLd {
  const base = siteUrl();
  return {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    url: base,
    inLanguage: ["bs", "en"],
    publisher: { "@id": `${base}/#organization` },
    description: getDictionary(locale).seo.home.description,
  };
}

function subscriptionOffers(plan: PlanId, name: string, url: string): JsonLd[] {
  return [
    {
      "@type": "Offer",
      name: `${name} (monthly)`,
      price: PLAN_PRICING_BAM[plan].monthly,
      priceCurrency: "BAM",
      url,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: PLAN_PRICING_BAM[plan].monthly,
        priceCurrency: "BAM",
        billingDuration: "P1M",
      },
    },
    {
      "@type": "Offer",
      name: `${name} (yearly)`,
      price: yearlyTotalBam(plan),
      priceCurrency: "BAM",
      url,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: yearlyTotalBam(plan),
        priceCurrency: "BAM",
        billingDuration: "P1Y",
      },
    },
  ];
}

/** The product: a web app with a one-time plan and two subscriptions. */
function application(locale: Locale): JsonLd {
  const base = siteUrl();
  const pricingUrl = `${base}${localePath(locale, "/pricing")}`;
  const dict = getDictionary(locale);
  return {
    "@type": "WebApplication",
    "@id": `${base}/#app`,
    name: SITE_NAME,
    url: `${base}${localePath(locale, "/")}`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web browser (iOS, Android, desktop)",
    inLanguage: locale,
    description: dict.seo.home.description,
    provider: { "@id": `${base}/#organization` },
    offers: [
      {
        "@type": "Offer",
        name: dict.marketing.couplePlan.name,
        price: ONE_EVENT_BAM,
        priceCurrency: "BAM",
        url: pricingUrl,
      },
      ...subscriptionOffers("solo", "Solo", pricingUrl),
      ...subscriptionOffers("pro", "Pro", pricingUrl),
    ],
  };
}

/** For the landing page: who, what, and what it costs. */
export function homeStructuredData(locale: Locale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [organization(), website(locale), application(locale)],
  };
}

/** For /pitanja: every question and its answer, as they read on the page. */
export function faqStructuredData(locale: Locale): JsonLd {
  const groups = getDictionary(locale).content.faq.groups;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };
}

/** The data as a script tag's contents; `<` escaped so no string can close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
