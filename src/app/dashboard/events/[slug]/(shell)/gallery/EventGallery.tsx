
import { Disclosure } from "@/components/disclosure";
import { GalleryCopyEditor } from "@/components/gallery-copy-editor";
import { GallerySectionsManager } from "@/components/gallery-sections-manager";
import { MediaGrid } from "@/components/media-grid";
import { Panel } from "@/components/ui/panel";
import { UploadDropzone } from "@/components/upload-dropzone";
import { getOwnerEventContext } from "@/lib/event-context";
import { eventLinks, listEventMedia, listGallerySections } from "@/lib/events";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { COPY_FIELDS, COPY_GROUPS, defaultCopy, sanitizeCustomCopy } from "@/lib/custom-copy";
import { enrichMediaWithUrls } from "@/lib/media";

/**
 * Everything about the gallery on one page: add files, the sections that
 * divide it, and the files themselves with moderation. It used to be three
 * separate blocks on the event page, below the settings.
 */
export async function EventGallery({ locale, slug }: { locale: Locale; slug: string }) {
  const dict = getDictionary(locale);
  const d = dict.dashboard;
  const e = d.event;
  const l = e.layout;

  const { event, accountType, isCouple } = await getOwnerEventContext(slug);

  const [media, sections] = await Promise.all([
    listEventMedia(event.id, { includeHidden: true, includeDeleted: true, sourceType: "all" }).then(enrichMediaWithUrls),
    listGallerySections(event.id),
  ]);

  const links = eventLinks(event.slug);
  const liveMedia = media.filter((item) => !item.deleted_at);
  const customCopy = sanitizeCustomCopy(event.custom_copy);
  const copyFields = COPY_FIELDS.map((field) => ({
    ...field,
    label: e.copyEditor.fields[field.key] ?? field.key,
    standard: defaultCopy(dict, field.key, event.title),
    value: customCopy[field.key] ?? "",
  }));
  const sectionCounts: Record<string, number> = {};
  for (const item of liveMedia) {
    if (item.section_id) sectionCounts[item.section_id] = (sectionCounts[item.section_id] ?? 0) + 1;
  }

  return (
    <>
      <Panel className="bg-white/90">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold text-[var(--color-ink)]">{l.galleryTitle}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-black/62">
              {isCouple ? l.galleryBodyCouple : l.galleryBody}
            </p>
          </div>
          <a
            href={links.galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
          >
            {l.previewBtn}
          </a>
        </div>

        {/* Open by default only while the gallery is empty: after that, adding
            files is the occasional job and the files are the daily one. */}
        <Disclosure
          className="group mt-6 rounded-[24px] border border-black/10 bg-[var(--color-paper)]/40"
          defaultOpen={liveMedia.length === 0}
          summary={
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-semibold text-[var(--color-ink)]">{l.addFilesTitle}</span>
                <span className="mt-0.5 block text-sm text-black/55">{l.addFilesBody}</span>
              </span>
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-lg font-semibold text-white transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
          }
        >
          <div className="px-3 pb-4 sm:px-5">
            <UploadDropzone
              endpoint={`/api/events/${event.slug}/photographer-upload-session`}
              target="photographer"
              allowVideo={true}
              pinRequired={false}
              audience={accountType}
              strings={{
                ...dict.uploadDropzone,
                chooseTitle: isCouple ? e.ownerUpload.chooseTitleCouple : e.ownerUpload.chooseTitle,
                chooseSubtitle: isCouple ? e.ownerUpload.chooseSubtitleCouple : e.ownerUpload.chooseSubtitle,
                selectPhotosBtn: e.ownerUpload.selectPhotosBtn,
                reviewTitle: e.ownerUpload.reviewTitle,
                sendBtn: e.ownerUpload.sendBtn,
                uploadingTitle: e.ownerUpload.uploadingTitle,
                successTitle: e.ownerUpload.successTitle,
                successBody: isCouple ? e.ownerUpload.successBodyCouple : e.ownerUpload.successBody,
                successNext: e.ownerUpload.successNext,
                uploadAnotherBtn: e.ownerUpload.uploadAnotherBtn,
                noAccountNeeded: e.ownerUpload.noAccountNeeded,
              }}
              nextLink={{ href: "#gallery-manager", label: e.ownerUpload.viewUploads }}
            />
          </div>
        </Disclosure>
      </Panel>

      <Panel className="bg-white/90">
        <Disclosure
          className="group"
          defaultOpen={false}
          summary={
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-display text-2xl font-semibold text-[var(--color-ink)]">{e.copyEditor.title}</span>
                <span className="mt-2 block max-w-2xl text-sm leading-6 text-black/62">{e.copyEditor.body}</span>
                <span className="mt-1 block text-xs text-black/45">{e.copyEditor.languageNote}</span>
              </span>
              <span
                aria-hidden
                className="mt-1 shrink-0 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition group-open:bg-[var(--color-paper)]"
              >
                <span className="group-open:hidden">↓</span>
                <span className="hidden group-open:inline">↑</span>
              </span>
            </summary>
          }
        >
          <div className="mt-5">
            <GalleryCopyEditor
              slug={event.slug}
              fields={copyFields}
              groups={COPY_GROUPS}
              strings={e.copyEditor}
              galleryUrl={links.galleryUrl}
              uploadUrl={links.uploadUrl}
            />
          </div>
        </Disclosure>
      </Panel>

      <Panel id="gallery-manager" className="scroll-mt-20 bg-white/90">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">{l.sectionsLabel}</h3>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/55">{l.sectionsHint}</p>
        <div className="mt-4">
          <GallerySectionsManager slug={event.slug} sections={sections} counts={sectionCounts} strings={d.sections} />
        </div>

        <div className="mt-6 border-t border-black/8 pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">{l.filesLabel}</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-black/55">
            {isCouple ? e.managerBodyCouple : e.managerBody}
          </p>
          <div className="mt-4">
            <MediaGrid
              media={media}
              ownerMode
              eventSlug={event.slug}
              coverImageId={event.cover_image_id}
              audience={accountType}
              sections={sections}
              strings={dict.galleryViewer}
              ownerStrings={d.mediaOwner}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}
