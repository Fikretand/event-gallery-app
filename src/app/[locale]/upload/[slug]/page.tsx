import { notFound } from "next/navigation";

import { LockIcon } from "@/components/ui/icons";
import { UploadDropzone } from "@/components/upload-dropzone";
import { VideoMessage } from "@/components/video-message";
import { formatDate } from "@/lib/utils";
import {
  getCoupleUploadEndsAt,
  getEventAccountType,
  getPublicEventBySlug,
  isEventExpired,
  isGuestUploadWindowClosed,
} from "@/lib/events";
import { applyCustomCopy, customTitle } from "@/lib/custom-copy";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { videoMessagesEnabled } from "@/lib/video-messages";
import { t } from "@/lib/i18n/index";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const lang: Locale = locale === "en" ? "en" : "bs";

  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  // The owner's own wording, where they wrote any, over the standard text.
  const dict = applyCustomCopy(getDictionary(lang), event.custom_copy);
  const d = dict.upload;
  const title = customTitle(event.custom_copy, "event.uploadTitle", event.title);

  const expired = isEventExpired(event);
  const archived = event.status === "archived";
  const settings = event.event_settings;
  const accountType = await getEventAccountType(event.owner_user_id);
  const uploadWindowClosed = isGuestUploadWindowClosed(event, accountType);
  const uploadWindowEndsAt =
    // The date alone: the time of day was the moment the event was created,
    // which read as an oddly exact deadline ("u 18:36").
    accountType === "couple" ? formatDate(getCoupleUploadEndsAt(event).slice(0, 10), lang) : null;

  const isClosed =
    expired || archived || uploadWindowClosed || settings?.allow_guest_upload === false;

  const closedReason = expired
    ? d.closedExpired
    : archived
      ? d.closedArchived
      : uploadWindowClosed
        ? `${d.closedWindowEnded}${uploadWindowEndsAt ? ` (${uploadWindowEndsAt})` : ""}.`
        : d.closedDisabled;

  const facts = [
    `${d.chipTypes}${settings?.allow_guest_video ? ", MP4, MOV" : ""}`,
    t(d.chipMaxSize, { maxMb: settings?.max_guest_upload_mb ?? 250 }),
    settings?.require_pin_for_upload ? d.chipPinRequired : d.chipNoAccount,
    ...(uploadWindowEndsAt ? [t(d.chipOpenUntil, { date: uploadWindowEndsAt })] : []),
  ];

  // One column the width of a phone, centred on a computer: the guest came
  // for one button, and everything here leads to it.
  return (
    <main className="min-h-dvh pb-[var(--space-3xl)]">
      <header className="mx-auto max-w-md px-4 pt-[var(--space-lg)]">
        <span className="font-display text-[1.375rem] font-semibold text-ink">Confetti</span>
      </header>

      <div className="mx-auto max-w-md px-4">
        <div className="pb-[var(--space-lg)] pt-[var(--space-xl)]">
          <h1 className="font-display text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[1.08] text-ink">{title}</h1>
          {event.event_date && <p className="meta mt-[var(--space-xs)]">{formatDate(event.event_date.slice(0, 10), lang)}</p>}
        </div>

        {isClosed ? (
          <div className="card p-[var(--space-xl)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-error-soft text-error">
              <LockIcon className="h-6 w-6" />
            </span>
            <h2 className="title mt-[var(--space-md)] text-ink">{d.closed}</h2>
            <p className="mt-[var(--space-xs)] text-ink-2">{closedReason}</p>
          </div>
        ) : (
          <>
            <UploadDropzone
              endpoint={`/api/events/${event.slug}/guest-upload-session`}
              target="guest"
              allowVideo={settings?.allow_guest_video ?? false}
              pinRequired={settings?.require_pin_for_upload ?? false}
              strings={dict.uploadDropzone}
            />
            {videoMessagesEnabled(settings) ? (
              <VideoMessage
                slug={event.slug}
                pinRequired={settings?.require_pin_for_upload ?? false}
                strings={dict.videoMessage}
                upload={dict.uploadDropzone}
              />
            ) : null}

            <ul className="mt-[var(--space-lg)] flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li key={fact} className="chip">
                  {fact}
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="meta mt-[var(--space-xl)]">{d.privacyNote}</p>
      </div>
    </main>
  );
}
