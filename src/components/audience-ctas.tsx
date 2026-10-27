import Link from "next/link";

import { TRIAL_DURATION_DAYS } from "@/lib/constants";
import { daysWord, getDictionary, t, type Locale } from "@/lib/i18n/index";
import { couplePlan } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/**
 * The two ways to start, side by side and never ambiguous: a photographer
 * account (many events, a trial) or an account for one event (paid once).
 *
 * Each button names the account; the line under it says what it is for. The
 * trial length and the price come from the same constants the product uses.
 * The photographer account is the filled primary, the one-event account the
 * outlined secondary, so the pair never reads as two equal choices of style.
 */
export function AudienceCtas({
  locale,
  align = "start",
  showPricingLink = false,
  stacked = false,
  onDark = false,
  className,
}: {
  locale: Locale;
  align?: "start" | "center";
  showPricingLink?: boolean;
  /** One above the other at every width — for narrow columns. */
  stacked?: boolean;
  /** On the ink band: the captions take the paper's lighter tone. */
  onDark?: boolean;
  className?: string;
}) {
  const s = getDictionary(locale).audienceCta;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      <ul
        className={cn(
          "grid w-full gap-4",
          !stacked && "sm:w-auto sm:grid-cols-[auto_auto]",
          align === "center" && "justify-center",
        )}
      >
        <li className="flex flex-col gap-2">
          <Link href={lp("/signup?intent=photographer")} className="btn btn-primary w-full">
            {s.photographerTitle}
          </Link>
          <span className={cn("meta px-1", onDark && "text-paper-3")}>
            {t(s.photographerBody, { days: TRIAL_DURATION_DAYS, unit: daysWord(TRIAL_DURATION_DAYS, locale) })}
          </span>
        </li>
        <li className="flex flex-col gap-2">
          <Link href={lp("/signup?intent=couple")} className="btn btn-secondary w-full">
            {s.eventTitle}
          </Link>
          <span className={cn("meta px-1", onDark && "text-paper-3")}>{t(s.eventBody, { price: couplePlan.price })}</span>
        </li>
      </ul>

      {showPricingLink ? (
        <Link href={lp("/pricing")} className="link self-start">
          {s.pricingLink}
        </Link>
      ) : null}
    </div>
  );
}
