import Link from "next/link";

import { TRIAL_DURATION_DAYS } from "@/lib/constants";
import { daysWord, getDictionary, t, type Locale } from "@/lib/i18n/index";
import { couplePlan } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/**
 * The two ways to start, side by side and never ambiguous: a photographer
 * account (many events, a trial) or an account for one event (paid once).
 *
 * Pages used to offer "Počni besplatno" next to "Pogledaj cijene", or two
 * buttons whose labels did not say which account they opened. Each button
 * now names the account and says in one line what it is for. The trial
 * length and the price come from the same constants the product uses.
 */
export function AudienceCtas({
  locale,
  align = "start",
  showPricingLink = false,
  stacked = false,
  className,
}: {
  locale: Locale;
  align?: "start" | "center";
  showPricingLink?: boolean;
  /** One above the other at every width — for narrow columns. */
  stacked?: boolean;
  className?: string;
}) {
  const s = getDictionary(locale).audienceCta;
  const lp = (path: string) => `/${locale}${path}`;

  const card =
    "group flex w-full items-center gap-3 rounded-[20px] px-3.5 py-3.5 text-left transition duration-200 hover:-translate-y-0.5";

  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center", className)}>
      <div
        className={cn(
          "flex w-full flex-col gap-3",
          // Side by side, the two buttons get equal columns and a sensible cap.
          !stacked && "sm:grid sm:max-w-[620px] sm:grid-cols-2",
          align === "center" && "sm:mx-auto",
        )}
      >
        <Link
          href={lp("/signup?intent=photographer")}
          className={cn(
            card,
            "bg-[var(--color-accent)] text-white shadow-[0_12px_32px_rgba(226,121,82,0.30)] hover:shadow-[0_16px_40px_rgba(226,121,82,0.38)]",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/20">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
              <path d="M8.5 6.5l1.4-2.2h4.2l1.4 2.2" />
              <circle cx="12" cy="13" r="3.4" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-5">{s.photographerTitle}</span>
            <span className="mt-0.5 block text-xs leading-4 text-white/85">
              {t(s.photographerBody, { days: TRIAL_DURATION_DAYS, unit: daysWord(TRIAL_DURATION_DAYS, locale) })}
            </span>
          </span>
        </Link>

        <Link
          href={lp("/signup?intent=couple")}
          className={cn(
            card,
            "border border-black/10 bg-white/90 text-[var(--color-ink)] shadow-[0_8px_24px_rgba(18,24,38,0.06)] hover:bg-white hover:shadow-[0_14px_34px_rgba(18,24,38,0.1)]",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 20.5s-7-4.3-7-9.4a3.6 3.6 0 016.999-1.2A3.6 3.6 0 0119 11.1c0 5.1-7 9.4-7 9.4z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold leading-5">{s.eventTitle}</span>
            <span className="mt-0.5 block text-xs leading-4 text-black/55">
              {t(s.eventBody, { price: couplePlan.price })}
            </span>
          </span>
        </Link>
      </div>

      {showPricingLink ? (
        <Link
          href={lp("/pricing")}
          className="text-sm font-semibold text-[var(--color-moss)] underline-offset-4 hover:underline"
        >
          {s.pricingLink}
        </Link>
      ) : null}
    </div>
  );
}
