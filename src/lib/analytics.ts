/**
 * Google Analytics 4, on the public pages only, and only after the visitor
 * agrees. Nothing here is loaded, set or sent before that.
 *
 * Guest galleries, upload pages and every event page of the dashboard are
 * never measured: they carry real people's photographs and couples' names
 * in their URLs. A page outside `isTrackedPath` disables the tag
 * (`ga-disable-<id>`), so not even an event fired by mistake leaves.
 *
 * GA4's own "page changes based on browser history events" (Enhanced
 * measurement) must stay OFF in the property: page views are sent here, and
 * only for tracked paths. Left on, a client-side hop from the dashboard into
 * an event page would send that page's URL before this code can stop it.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-3ZRH50NPCX";

/** The production hosts. Previews and local runs send nothing. */
const MEASURED_HOST = /(^|\.)confetti\.ba$/;

export function analyticsEnabledOn(hostname: string): boolean {
  return MEASURED_HOST.test(hostname) || process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";
}

const LOCALE_PREFIX = /^\/(en|bs)(?=\/|$)/;

/** Dashboard pages without an event or a person in their URL. */
const DASHBOARD_ROOTS = new Set(["/dashboard", "/dashboard/couple", "/dashboard/billing"]);

const NEVER = ["/gallery", "/upload", "/dashboard", "/admin", "/auth", "/api"];

/** Whether a page may be measured. `pathname` is the URL path, with or without a locale prefix. */
export function isTrackedPath(pathname: string): boolean {
  const path = pathname.replace(LOCALE_PREFIX, "").replace(/\/+$/, "") || "/";
  if (DASHBOARD_ROOTS.has(path)) return true;
  return !NEVER.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/**
 * Query parameters that can carry personal data or secrets. Google's terms
 * forbid sending personal data such as an email address, and the signup
 * flow puts one in the URL (`/signup/verify?email=`).
 */
const DROPPED_PARAMS = ["email", "code", "token", "token_hash", "next", "name"];

/** The URL as it is sent to Google: personal and secret parameters removed, campaign tags kept. */
export function sanitizeUrl(href: string): string {
  const url = new URL(href);
  for (const key of DROPPED_PARAMS) url.searchParams.delete(key);
  url.hash = "";
  return url.toString();
}

export type ConsentChoice = "granted" | "denied";

export const CONSENT_KEY = "confetti-analytics-consent";

/** The visitor's stored choice, or null when they have not chosen (or storage is blocked). */
export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    // Storage blocked (private mode): the choice holds for this page only.
  }
}

/** The event the footer's "cookie settings" link sends to reopen the banner. */
export const OPEN_CONSENT_EVENT = "confetti:open-consent";

type Gtag = (...args: unknown[]) => void;

/**
 * Send one event, if the tag is loaded on this page. A no-op before consent,
 * on private pages, on previews and on the server.
 */
export function track(event: string, params: Record<string, string | number | undefined> = {}): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!gtag || !isTrackedPath(window.location.pathname)) return;
  gtag("event", event, params);
}

/** Set by the signup action; read once by the analytics component to send `sign_up`. */
export const SIGNUP_COOKIE = "confetti_signup";
