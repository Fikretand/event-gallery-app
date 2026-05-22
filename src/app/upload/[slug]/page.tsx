import { notFound } from "next/navigation";

import { UploadDropzone } from "@/components/upload-dropzone";
import { formatDate } from "@/lib/utils";
import { getCoupleUploadEndsAt, getEventAccountType, getPublicEventBySlug, isEventExpired, isGuestUploadWindowClosed } from "@/lib/events";

export default async function UploadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const expired = isEventExpired(event);
  const archived = event.status === "archived";
  const settings = event.event_settings;
  const accountType = await getEventAccountType(event.owner_user_id);
  const uploadWindowClosed = isGuestUploadWindowClosed(event, accountType);
  const uploadWindowEndsAt = accountType === "couple" ? formatDate(getCoupleUploadEndsAt(event)) : null;

  const isClosed = expired || archived || uploadWindowClosed || settings?.allow_guest_upload === false;

  return (
    <main className="min-h-dvh pb-24">
      {/* Brand header */}
      <div className="py-7 text-center">
        <span className="font-display text-[1.1rem] font-semibold tracking-tight text-[var(--color-ink)]">
          ✦ Confetti
        </span>
      </div>

      {/* Event info */}
      <div className="px-5 pb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/50 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            Guest Upload
          </span>
        </span>
        <h1 className="font-display mt-4 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
          {event.title}
        </h1>
        {event.event_date && (
          <p className="mt-2 text-sm text-black/45">{formatDate(event.event_date)}</p>
        )}
      </div>

      {/* Main upload zone */}
      <div className="mx-auto max-w-md px-4">
        {isClosed ? (
          <div className="rounded-[28px] bg-white/90 p-8 text-center shadow-[0_8px_40px_rgba(18,24,38,0.06)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0eb] text-2xl">
              🔒
            </div>
            <h2 className="font-display text-xl font-semibold text-[var(--color-ink)]">Uploads are closed</h2>
            <p className="mt-2 text-sm leading-6 text-black/55">
              {expired
                ? "This event has expired and is no longer accepting new uploads."
                : archived
                  ? "This event is archived and no longer accepting uploads."
                  : uploadWindowClosed
                    ? `The upload window for this event has ended${uploadWindowEndsAt ? ` (closed ${uploadWindowEndsAt})` : ""}.`
                    : "The event organizer has disabled guest uploads for this event."}
            </p>
          </div>
        ) : (
          <UploadDropzone
            endpoint={`/api/events/${event.slug}/guest-upload-session`}
            target="guest"
            allowVideo={settings?.allow_guest_video ?? false}
            pinRequired={settings?.require_pin_for_upload ?? false}
          />
        )}
      </div>

      {/* Info chips */}
      {!isClosed && (
        <div className="mx-auto mt-8 max-w-md px-4">
          <div className="flex flex-wrap justify-center gap-2">
            <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-black/42">
              📎 JPG, PNG, HEIC{settings?.allow_guest_video ? ", MP4, MOV" : ""}
            </span>
            <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-black/42">
              📦 Max {settings?.max_guest_upload_mb ?? 250} MB per file
            </span>
            <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-black/42">
              {settings?.require_pin_for_upload ? "🔑 PIN required" : "👍 No account needed"}
            </span>
            {uploadWindowEndsAt && (
              <span className="rounded-full border border-black/8 bg-white/70 px-3 py-1.5 text-xs text-black/42">
                ⏳ Open until {uploadWindowEndsAt}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-10 px-5 text-center text-xs text-black/28">
        Your photos are stored privately and only visible to the event host.
      </p>
    </main>
  );
}
