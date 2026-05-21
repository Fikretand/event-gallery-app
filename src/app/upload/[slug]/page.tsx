import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
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
  const introCopy = "Share your favorite moments from the day in just a few taps.";

  return (
    <main className="pb-16 pt-6 md:pt-8">
      <section className="shell mx-auto max-w-5xl space-y-5">
        <Panel className="mesh-card bg-white/94 p-5 md:p-7">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-moss)]">Guest upload</p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] md:text-5xl">{event.title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-black/62 md:text-base md:leading-7">{introCopy}</p>
          </div>
        </Panel>

        <Panel className="bg-white/96 p-4 md:p-6">
          {expired ? (
            <div className="rounded-[24px] bg-[#fff0eb] p-6 text-sm leading-6 text-[#8a1c1c]">
              This event has expired, so uploads are currently closed.
            </div>
          ) : archived ? (
            <div className="rounded-[24px] bg-[#fff0eb] p-6 text-sm leading-6 text-[#8a1c1c]">
              This event is archived in cold storage, so uploads are currently closed.
            </div>
          ) : uploadWindowClosed ? (
            <div className="rounded-[24px] bg-[#fff0eb] p-6 text-sm leading-6 text-[#8a1c1c]">
              Guest uploads are closed for this event. The upload window for this plan has ended.
            </div>
          ) : settings?.allow_guest_upload === false ? (
            <div className="rounded-[24px] bg-[#fff0eb] p-6 text-sm leading-6 text-[#8a1c1c]">
              Guest uploads are disabled for this event.
            </div>
          ) : (
            <UploadDropzone
              endpoint={`/api/events/${event.slug}/guest-upload-session`}
              target="guest"
              allowVideo={settings?.allow_guest_video ?? false}
              pinRequired={settings?.require_pin_for_upload ?? false}
            />
          )}
        </Panel>

        <Panel className="bg-white/94 p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-black/8 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/68">
              <p className="font-semibold text-[var(--color-ink)]">Accepted files</p>
              <p className="mt-1">JPG, PNG, HEIC{settings?.allow_guest_video ? ", MP4, MOV" : ""}</p>
            </div>
            <div className="rounded-[22px] border border-black/8 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/68">
              <p className="font-semibold text-[var(--color-ink)]">Max file size</p>
              <p className="mt-1">{settings?.max_guest_upload_mb ?? 250} MB per file</p>
            </div>
            <div className="rounded-[22px] border border-black/8 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/68">
              <p className="font-semibold text-[var(--color-ink)]">Access</p>
              <p className="mt-1">{settings?.require_pin_for_upload ? "Host PIN required" : "No guest account needed"}</p>
            </div>
            {uploadWindowEndsAt ? (
              <div className="rounded-[22px] border border-black/8 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/68">
                <p className="font-semibold text-[var(--color-ink)]">Uploads open until</p>
                <p className="mt-1">{uploadWindowEndsAt}</p>
              </div>
            ) : null}
          </div>
        </Panel>
      </section>
    </main>
  );
}
