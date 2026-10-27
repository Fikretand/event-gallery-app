import Link from "next/link";

import { daysWord, t, type Dict, type Locale } from "@/lib/i18n/index";
import { retentionNotice, type RetentionSchedule } from "@/lib/retention";
import { cn, formatDate } from "@/lib/utils";

/**
 * Tells the owner when an expired gallery's files will be deleted, from the
 * same schedule the nightly purge uses. Renders nothing outside the warning
 * window. Turns red in the last week.
 */
export function RetentionNotice({
  schedule,
  kind,
  strings,
  locale,
  href,
  cta,
}: {
  schedule: RetentionSchedule | null;
  kind: "couple" | "trial";
  strings: Dict["dashboard"]["retention"];
  locale: Locale;
  href?: string;
  cta?: string;
}) {
  const notice = retentionNotice(schedule);
  if (!notice) return null;

  const date = formatDate(notice.purgeAt.toISOString().slice(0, 10), locale);

  return (
    <div
      role={notice.urgent ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-3 rounded-[24px] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
        notice.urgent ? "border-[var(--color-error-soft)] bg-[var(--color-error-soft)]" : "border-[var(--color-accent-soft)] bg-[var(--color-paper)]",
      )}
    >
      <div>
        <p className={cn("text-sm font-semibold", notice.urgent ? "text-[var(--color-error)]" : "text-[var(--color-ink)]")}>
          {notice.urgent
            ? t(strings.urgentTitle, { days: notice.daysLeft, unit: daysWord(notice.daysLeft, locale) })
            : t(strings.title, { date })}
        </p>
        <p className="mt-1 text-sm leading-6 text-ink-2">
          {kind === "couple" ? strings.coupleBody : strings.trialBody}
          {notice.urgent ? ` (${date})` : null}
        </p>
      </div>
      {href && cta ? (
        <Link
          href={href}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white",
            notice.urgent ? "bg-[var(--color-error)] hover:bg-[var(--color-error)]" : "bg-[var(--color-ink)] hover:bg-[var(--color-ink)]/85",
          )}
        >
          {cta}
        </Link>
      ) : null}
    </div>
  );
}
