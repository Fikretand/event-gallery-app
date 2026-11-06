"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  CONSENT_KEY,
  GA_MEASUREMENT_ID,
  OPEN_CONSENT_EVENT,
  SIGNUP_COOKIE,
  analyticsEnabledOn,
  isTrackedPath,
  readConsent,
  sanitizeUrl,
  track,
  writeConsent,
  type ConsentChoice,
} from "@/lib/analytics";
import { getDictionary } from "@/lib/i18n/index";

type Gtag = (...args: unknown[]) => void;
type GaWindow = Window & { dataLayer?: unknown[]; gtag?: Gtag } & Record<string, unknown>;

const CONSENT_CHANGED = "confetti:consent-changed";

// The stored choice as an external store, so the first render on the client
// matches the server's (nothing chosen yet) and no effect has to copy it.
function subscribeConsent(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_KEY) onChange();
  };
  window.addEventListener(CONSENT_CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONSENT_CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
const noSubscribe = () => () => {};

/** Load gtag.js once. Advertising signals stay off: this is only for counting visits. */
function loadGtag() {
  const w = window as unknown as GaWindow;
  if (w.gtag) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  w.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  w.gtag("js", new Date());
  w.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** Remove Google Analytics' cookies after the visitor withdraws consent. */
function clearGaCookies() {
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  const host = window.location.hostname;
  const apex = host.split(".").slice(-2).join(".");
  for (const name of names) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${apex}`]) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

function takeSignupCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SIGNUP_COOKIE}=([^;]*)`));
  if (!match) return null;
  document.cookie = `${SIGNUP_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  return decodeURIComponent(match[1]);
}

/**
 * Google Analytics with a consent banner. Mounted once in the root layout.
 *
 * - Off on previews and local runs (`analyticsEnabledOn`).
 * - Asks only on pages it would measure; guest galleries never see a banner.
 * - Loads nothing until "Prihvatam". "Odbijam" is one click, as easy as yes.
 * - Sends one page view per tracked page, with personal query parameters
 *   removed, and one `cta_click` for any element marked `data-track`.
 */
export function Analytics() {
  const pathname = usePathname() ?? "/";
  const enabled = useSyncExternalStore(noSubscribe, () => analyticsEnabledOn(window.location.hostname), () => false);
  const choice = useSyncExternalStore<ConsentChoice | "none" | "server">(
    subscribeConsent,
    () => readConsent() ?? "none",
    () => "server",
  );
  const [reopened, setReopened] = useState(false);
  const tracked = isTrackedPath(pathname);
  const granted = enabled && choice === "granted";

  useEffect(() => {
    const open = () => setReopened(true);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  // Not even the script is fetched on a page that is never measured: a guest
  // opening a gallery makes no request to Google at all.
  useEffect(() => {
    if (granted && tracked) loadGtag();
  }, [granted, tracked]);

  // On every page: block the tag where it must not run, and count the page
  // where it may.
  useEffect(() => {
    if (!enabled) return;
    const w = window as unknown as GaWindow;
    w[`ga-disable-${GA_MEASUREMENT_ID}`] = !(granted && tracked);
    if (!granted || !tracked) return;
    w.gtag?.("event", "page_view", {
      page_location: sanitizeUrl(window.location.href),
      page_title: document.title,
    });
    const signup = takeSignupCookie();
    if (signup) track("sign_up", { method: signup });
  }, [enabled, granted, tracked, pathname]);

  useEffect(() => {
    if (!granted) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("[data-track]") : null;
      const name = target?.getAttribute("data-track");
      if (name) track("cta_click", { cta: name, page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [granted]);

  if (!enabled || choice === "server") return null;
  if (!(reopened || (choice === "none" && tracked))) return null;

  const locale = pathname.startsWith("/bs") ? "bs" : "en";
  const s = getDictionary(locale).cookieConsent;

  const decide = (next: ConsentChoice) => {
    writeConsent(next);
    if (next === "denied") {
      (window as unknown as GaWindow)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
      clearGaCookies();
    }
    setReopened(false);
    window.dispatchEvent(new Event(CONSENT_CHANGED));
  };

  return (
    <div
      role="region"
      aria-label={s.label}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-toast)] p-4 sm:p-6"
    >
      <div className="card pointer-events-auto mx-auto flex max-w-3xl flex-col gap-4 p-5 shadow-[var(--shadow-overlay)] sm:flex-row sm:items-center sm:gap-6">
        <p className="text-[0.9375rem] leading-relaxed text-ink-2">
          {s.text}{" "}
          <Link href={`/${locale}/privacy`} className="link whitespace-nowrap">
            {s.privacyLink}
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={() => decide("denied")} className="btn btn-sm btn-secondary flex-1 sm:flex-none">
            {s.decline}
          </button>
          <button type="button" onClick={() => decide("granted")} className="btn btn-sm btn-ink flex-1 sm:flex-none">
            {s.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Cookie settings" in the footer: reopens the banner to change the choice. */
export function CookieSettingsButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className={className}>
      {label}
    </button>
  );
}
