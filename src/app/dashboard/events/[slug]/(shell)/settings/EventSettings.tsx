
import { EventLifecyclePanel } from "@/components/event-lifecycle-panel";
import { EventSettingsForm } from "@/components/event-settings-form";
import { Panel } from "@/components/ui/panel";
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

      <Panel className="bg-white/90">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{l.historyTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-black/62">
                {isCouple ? e.activityBodyCouple : e.activityBody}
              </p>
            </div>
            <span
              aria-hidden
              className="mt-1 shrink-0 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition group-open:bg-[var(--color-paper)]"
            >
              <span className="group-open:hidden">↓</span>
              <span className="hidden group-open:inline">↑</span>
            </span>
          </summary>

          {activity.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center text-sm text-black/58">
              {e.activityEmpty}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-[24px] border border-black/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {activityLabel(item.action, e.activityLabels)}
                    </p>
                    <p className="mt-1 truncate text-sm text-black/58">
                      {typeof item.metadata?.filename === "string" ? item.metadata.filename : e.activityFallback}
                    </p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.18em] text-black/45">{formatDate(item.created_at, locale)}</p>
                </div>
              ))}
            </div>
          )}
        </details>
      </Panel>

      {!isCouple ? (
        <Panel className="border-[#e9b4a4]/60 bg-white/90">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{e.dangerZone}</h2>
          <p className="mt-2 text-sm leading-6 text-black/62">{e.dangerZoneBody}</p>
          <div className="mt-5">
            <EventLifecyclePanel slug={event.slug} strings={d.lifecycle} />
          </div>
        </Panel>
      ) : null}
    </>
  );
}
