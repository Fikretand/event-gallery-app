"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { Dict } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";
import { PhotoIcon } from "@/components/ui/icons";

type Strings = Dict["dashboard"]["event"]["cover"];

export type CoverCandidate = { id: string; thumbnailUrl: string };

/** `{{name}}` interpolation, local so the dictionary helpers stay out of the client bundle. */
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

async function setCover(slug: string, coverImageId: string | null) {
  const response = await fetch(`/api/events/${slug}/cover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coverImageId }),
  });
  if (!response.ok) throw new Error("cover");
}

/**
 * A cover has to be a file of this event (the cover route checks), so a photo
 * picked from the device goes through the owner's ordinary upload path —
 * session, presigned PUT, confirm — and the new file becomes the cover. The
 * trial, storage and expiry checks on that path apply here as well.
 */
async function uploadAsCover(slug: string, file: File) {
  const sessionResponse = await fetch(`/api/events/${slug}/photographer-upload-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: [{ name: file.name, size: file.size, type: file.type }] }),
  });
  const session = await sessionResponse.json().catch(() => ({}));
  if (!sessionResponse.ok || !session.grants?.[0]) throw new Error("session");

  const grant = session.grants[0];
  const put = await fetch(grant.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error("put");

  const confirmResponse = await fetch("/api/uploads/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: session.eventId,
      objectKey: grant.objectKey,
      originalFilename: grant.originalFilename,
      mimeType: grant.contentType,
      sizeBytes: grant.size,
      sourceType: grant.sourceType,
      uploadSessionId: session.uploadSessionId ?? null,
      confirmToken: grant.confirmToken,
    }),
  });
  const confirmed = await confirmResponse.json().catch(() => ({}));
  if (!confirmResponse.ok || !confirmed.mediaId) throw new Error("confirm");

  await setCover(slug, confirmed.mediaId);
}

export function EventCoverPicker({
  slug,
  title,
  coverUrl,
  candidates,
  strings: s,
}: {
  slug: string;
  title: string;
  coverUrl: string | null;
  /** Visible images of this event, newest first — hidden or deleted files never become the public cover. */
  candidates: CoverCandidate[];
  strings: Strings;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // "menu" is the change/remove choice once a cover exists; "grid" is the
  // thumbnail picker. Without a cover the choices are shown straight away.
  const [menuOpen, setMenuOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isWorking, startWork] = useTransition();

  function run(job: () => Promise<void>) {
    setFailed(false);
    startWork(async () => {
      try {
        await job();
        setMenuOpen(false);
        setGridOpen(false);
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  }

  const choicesVisible = !coverUrl || menuOpen;

  const buttonBase = "btn btn-sm w-full";

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        // No HEIC: iOS then hands over a JPEG, which every browser can show.
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) run(() => uploadAsCover(slug, file));
        }}
      />

      <div className="relative overflow-hidden rounded-[var(--radius-image)] bg-paper-2">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={title} className="aspect-[4/5] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <PhotoIcon className="h-7 w-7 text-muted" />
            <p className="font-semibold text-ink">{s.emptyTitle}</p>
            <p className="text-sm leading-5 text-ink-2">{s.emptyBody}</p>
          </div>
        )}

        {isWorking ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card">
            <div className="keep-motion h-10 w-10 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink">{s.working}</p>
          </div>
        ) : null}
      </div>

      {!choicesVisible ? (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          disabled={isWorking}
          className={cn(buttonBase, "btn-secondary")}
        >
          {s.changeBtn}
        </button>
      ) : null}

      {choicesVisible ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isWorking}
            className={cn(buttonBase, "btn-secondary")}
          >
            {s.uploadBtn}
          </button>
          {candidates.length > 0 ? (
            <button
              type="button"
              onClick={() => setGridOpen((open) => !open)}
              disabled={isWorking}
              aria-expanded={gridOpen}
              className={cn(buttonBase, "btn-secondary")}
            >
              {fill(s.chooseBtn, { count: candidates.length })}
            </button>
          ) : null}
          <p className="meta px-1">{s.uploadNote}</p>
        </div>
      ) : null}

      {gridOpen && candidates.length > 0 ? (
        <div>
          <p className="pb-2 text-sm font-semibold text-ink">{s.pickTitle}</p>
          <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={isWorking}
                onClick={() => run(() => setCover(slug, candidate.id))}
                className="overflow-hidden rounded-[var(--radius-inner)] transition-shadow duration-[var(--dur-micro)] hover:ring-2 hover:ring-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={candidate.thumbnailUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {menuOpen || gridOpen ? (
        <div className="flex flex-col gap-2">
          {coverUrl ? (
            <button
              type="button"
              disabled={isWorking}
              onClick={() => run(() => setCover(slug, null))}
              className={cn(buttonBase, "btn-danger-quiet")}
            >
              {s.removeBtn}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setGridOpen(false);
            }}
            disabled={isWorking}
            className={cn(buttonBase, "btn-quiet")}
          >
            {s.closeBtn}
          </button>
        </div>
      ) : null}

      {failed ? (
        <p role="alert" className="notice notice-error">
          {s.failed}
        </p>
      ) : null}
    </div>
  );
}
