import {
  ONE_EVENT_BAM,
  PLAN_PRICING_BAM,
  annualSavingPercent,
  formatBam,
  yearlyTotalBam,
} from "@/lib/pricing";

/**
 * Locale-independent plan facts for the marketing pages.
 *
 * Prices are derived from `@/lib/pricing`, never typed in again, so the number
 * on the pricing page is the number Polar charges. Names, summaries and
 * feature copy are translated and live in the i18n dictionaries instead.
 *
 * Feature lists must describe what the app actually enforces. Solo and Pro
 * differ in exactly two things — `SOLO_/PRO_ACTIVE_EVENT_LIMIT` and
 * `SOLO_/PRO_STORAGE_LIMIT_BYTES` in `constants.ts`. Everything else works the
 * same on both, so claiming otherwise would be selling a difference that does
 * not exist.
 */

export const photographerPlans = [
  {
    name: "Solo",
    yearlyPrice: formatBam(PLAN_PRICING_BAM.solo.yearly),
    monthlyPrice: formatBam(PLAN_PRICING_BAM.solo.monthly),
    yearlyTotal: formatBam(yearlyTotalBam("solo")),
    savingPercent: annualSavingPercent("solo"),
  },
  {
    name: "Pro",
    yearlyPrice: formatBam(PLAN_PRICING_BAM.pro.yearly),
    monthlyPrice: formatBam(PLAN_PRICING_BAM.pro.monthly),
    yearlyTotal: formatBam(yearlyTotalBam("pro")),
    savingPercent: annualSavingPercent("pro"),
    featured: true,
  },
];

export const couplePlan = {
  name: "One Event",
  price: formatBam(ONE_EVENT_BAM),
};

export const photographerBenefits = [
  {
    title: "One event, two streams",
    body: "Collect guest photos and upload your final gallery inside the same event, without mixing your workflow.",
  },
  {
    title: "QR handoff that feels premium",
    body: "Share a printable QR code so guests can send moments instantly, without an app or account.",
  },
  {
    title: "Private by default",
    body: "PIN-protected galleries, hidden guest uploads, and controlled downloads keep delivery calm and professional.",
  },
];

export const coupleBenefits = [
  {
    title: "Every guest memory in one place",
    body: "Friends and family scan the code, upload instantly, and help you capture the whole day from every angle.",
  },
  {
    title: "No app, no confusion",
    body: "Guests open a simple mobile page, choose files, and send them. That is it.",
  },
  {
    title: "A gallery you can actually revisit",
    body: "Keep every guest memory in one private space you can revisit and download later.",
  },
];

export const faqs = [
  {
    question: "Do public links change if I rename the event later?",
    answer:
      "No. Guest upload links, client gallery links, and printed QR codes stay fixed after event creation so shared materials keep working.",
  },
  {
    question: "Can guests upload without making an account?",
    answer: "Yes. Guests open the upload page from a link or QR code and can send files without signing in.",
  },
  {
    question: "How do deleted files work?",
    answer:
      "Deleted files first move into a deleted state so the photographer can restore them. They can also be permanently removed or auto-purged later.",
  },
];

export const testimonials = [
  {
    quote: "The guest QR flow finally gave us one clean place for event moments instead of chasing uploads afterwards.",
    author: "Studio Nova",
    role: "Event photographer",
  },
  {
    quote: "What felt premium was the privacy. Guests could upload instantly, but the gallery still felt controlled and polished.",
    author: "Lejla & Harun",
    role: "Couple",
  },
  {
    quote: "Confetti feels like a product we can actually hand to clients, not just another folder link with a logo on top.",
    author: "Mira Events",
    role: "Event photographer",
  },
];

export const photographerSwitchReasons = [
  "One private workflow instead of patching together upload links, folders, and follow-up messages.",
  "Hidden-by-default guest uploads so you can review first and show only what belongs in the final gallery.",
  "Stable QR and gallery links that still work after renaming the event or printing signage.",
  "A more premium client handoff that feels like part of your service, not an afterthought.",
];

export const couplePlanHighlights = [
  "No limit on how many photos your guests send, from one QR code they can open in seconds.",
  "Guest videos included, switched on or off per event.",
  "One protected gallery that keeps every guest memory in one private place.",
  "Gallery sections so you can organise moments like Ceremony, Reception, or Photoshoot.",
  "Download everything as a ZIP later, without hunting through chats or shared drives.",
  "A one-time payment — no subscription to remember or cancel.",
];
