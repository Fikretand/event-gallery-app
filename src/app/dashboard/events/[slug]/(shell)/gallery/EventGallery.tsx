
import { Disclosure } from "@/components/disclosure";
import { GalleryCopyEditor } from "@/components/gallery-copy-editor";
import { GallerySectionsManager } from "@/components/gallery-sections-manager";
import { MediaGrid } from "@/components/media-grid";
import { ChevronDownIcon, ExternalIcon, PlusIcon } from "@/components/ui/icons";
import { UploadDropzone } from "@/components/upload-dropzone";
import { getOwnerEventContext } from "@/lib/event-context";
import { eventLinks, listEventMedia, listGallerySections } from "@/lib/events";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { COPY_FIELDS, COPY_GROUPS, defaultCopy, sanitizeCustomCopy } from "@/lib/custom-copy";
import { enrichMediaWithUrls } from "@/lib/media";
import { countReportsByMedia } from "@/lib/media-reports";

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

  const [files, sections, reportCounts] = await Promise.all([
    listEventMedia(event.id, { includeHidden: true, includeDeleted: true, sourceType: "all" }).then(enrichMediaWithUrls),
    listGallerySections(event.id),
    countReportsByMedia(event.id),
  ]);
  const media = files.map((item) => ({ ...item, report_count: reportCounts.get(item.id) ?? 0 }));

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
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="app-section-title text-ink">{l.galleryTitle}</h2>
            <p className="mt-1 max-w-xl text-ink-2">
              {isCouple ? l.galleryBodyCouple : l.galleryBody}
            </p>
          </div>
          <a
            href={links.galleryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-quiet shrink-0"
          >
            {l.previewBtn}
            <ExternalIcon className="h-4 w-4" />
          </a>
        </div>

        {/* Open by default only while the gallery is empty: after that, adding
            files is the occasional job and the files are the daily one. */}
        <Disclosure
          className="group well mt-[var(--space-lg)]"
          defaultOpen={liveMedia.length === 0}
          summary={
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-[var(--radius-card)] px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block font-semibold text-ink">{l.addFilesTitle}</span>
                <span className="mt-0.5 block text-sm text-ink-2">{l.addFilesBody}</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-ink ring-1 ring-rule-2 transition-transform duration-[var(--dur-short)] group-open:rotate-45">
                <PlusIcon className="h-4 w-4" />
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
      </section>

      <section className="border-t border-rule pt-[var(--space-lg)]">
        <Disclosure
          className="group"
          defaultOpen={false}
          summary={
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-[var(--radius-inner)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
              <span>
                <span className="app-section-title block text-ink">{e.copyEditor.title}</span>
                <span className="mt-1 block max-w-2xl text-ink-2">{e.copyEditor.body}</span>
                <span className="meta mt-1 block">{e.copyEditor.languageNote}</span>
              </span>
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-rule-2 transition-transform duration-[var(--dur-short)] group-open:rotate-180">
                <ChevronDownIcon className="h-4 w-4" />
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
      </section>

      <section id="gallery-manager" className="scroll-mt-20 border-t border-rule pt-[var(--space-lg)]">
        <h3 className="app-section-title text-ink">{l.sectionsLabel}</h3>
        <p className="mt-1 max-w-2xl text-ink-2">{l.sectionsHint}</p>
        <div className="mt-4">
          <GallerySectionsManager slug={event.slug} sections={sections} counts={sectionCounts} strings={d.sections} />
        </div>

        <div className="mt-[var(--space-xl)] border-t border-rule pt-[var(--space-lg)]">
          <h3 className="app-section-title text-ink">{l.filesLabel}</h3>
          <p className="mt-1 max-w-2xl text-ink-2">
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
      </section>
    </>
  );
}
