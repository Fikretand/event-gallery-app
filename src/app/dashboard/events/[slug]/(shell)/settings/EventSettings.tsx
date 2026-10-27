
import { EventLifecyclePanel } from "@/components/event-lifecycle-panel";
import { EventSettingsForm } from "@/components/event-settings-form";
import { ChevronDownIcon } from "@/components/ui/icons";
import { updateEventAction } from "@/lib/actions";
import { getOwnerEventContext } from "@/lib/event-context";
import {
  getCoupleAccessEndsAt,
  getCoupleUploadEndsAt,
  listEventActivity,
} from "@/lib/events";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { formatDate } from "@/lib/utils";

type EventStrings = ReturnType<typeof getDictionary>["dashboard"]["event"];

function activityLabel(action: string, labels: EventStrings["activityLabels"]): string {
  return labels[action as keyof typeof labels] ?? action;
}

/** Settings are set once and rarely touched again, so they live off the main page. */
export async function EventSettings({
  locale,
  slug,
  searchParams,
}: {
  locale: Locale;
  slug: string;
  searchParams?: { saved?: string };
}) {
  const dict = getDictionary(locale);
  const d = dict.dashboard;
  const e = d.event;
  const l = e.layout;

  const { event, accountType, isCouple } = await getOwnerEventContext(slug);

  const activity = await listEventActivity(event.id);
  const coupleUploadEndsAt = isCouple ? getCoupleUploadEndsAt(event) : null;
  const coupleAccessEndsAt = isCouple ? getCoupleAccessEndsAt(event) : null;

  return (
    <>
      <EventSettingsForm
        event={event}
        action={updateEventAction.bind(null, event.slug, locale)}
        saved={searchParams?.saved === "1"}
        audience={accountType}
        expiresAtMax={coupleAccessEndsAt ? coupleAccessEndsAt.slice(0, 16) : undefined}
        planWindow={
          isCouple && coupleUploadEndsAt && coupleAccessEndsAt
            ? {
                uploadEndsLabel: formatDate(coupleUploadEndsAt, locale),
                accessEndsLabel: formatDate(coupleAccessEndsAt, locale),
              }
            : null
        }
        strings={d.settings}
      />

      <section className="border-t border-rule pt-[var(--space-lg)]">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[var(--radius-inner)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="app-section-title text-ink">{l.historyTitle}</h2>
              <p className="mt-1 text-ink-2">{isCouple ? e.activityBodyCouple : e.activityBody}</p>
            </div>
            <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-rule-2 transition-transform duration-[var(--dur-short)] group-open:rotate-180">
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          </summary>

          {activity.length === 0 ? (
            <p className="well mt-[var(--space-md)] px-6 py-8 text-ink-2">{e.activityEmpty}</p>
          ) : (
            <ul className="mt-[var(--space-md)] border-t border-rule">
              {activity.map((item) => (
                <li key={item.id} className="flex flex-col gap-1 border-b border-rule py-3 md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{activityLabel(item.action, e.activityLabels)}</p>
                    <p className="truncate text-sm text-ink-2">
                      {typeof item.metadata?.filename === "string" ? item.metadata.filename : e.activityFallback}
                    </p>
                  </div>
                  <p className="num shrink-0 text-sm text-muted">{formatDate(item.created_at, locale)}</p>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      {!isCouple ? (
        <section className="border-t border-rule pt-[var(--space-lg)]">
          <h2 className="app-section-title text-error">{e.dangerZone}</h2>
          <p className="mt-1 max-w-2xl text-ink-2">{e.dangerZoneBody}</p>
          <div className="mt-[var(--space-md)]">
            <EventLifecyclePanel slug={event.slug} strings={d.lifecycle} />
          </div>
        </section>
      ) : null}
    </>
  );
}
