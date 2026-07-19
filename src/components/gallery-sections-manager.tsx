"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createGallerySectionAction, deleteGallerySectionAction, renameGallerySectionAction } from "@/lib/actions";
import type { GallerySectionRecord } from "@/lib/types";
import type { Dict } from "@/lib/i18n/index";
import { Button } from "@/components/ui/button";

type SectionStrings = Dict["dashboard"]["sections"];

export function GallerySectionsManager({
  slug,
  sections,
  strings,
}: {
  slug: string;
  sections: GallerySectionRecord[];
  strings: SectionStrings;
}) {
  const [createState, createAction, isCreating] = useActionState(createGallerySectionAction.bind(null, slug), undefined);

  return (
    <div className="space-y-4">
      <form action={createAction} className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-white p-4 md:flex-row">
        <input
          name="name"
          required
          placeholder={strings.addPlaceholder}
          className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20"
        />
        <Button type="submit" disabled={isCreating}>
          {isCreating ? strings.adding : strings.addButton}
        </Button>
      </form>

      {createState?.error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{createState.error}</div> : null}

      {sections.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 px-5 py-8 text-sm leading-6 text-black/58">
          {strings.empty}
        </div>
      ) : (
        <div className="grid gap-3">
          {sections.map((section) => (
            <SectionRow key={section.id} slug={slug} section={section} strings={strings} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRow({
  slug,
  section,
  strings,
}: {
  slug: string;
  section: GallerySectionRecord;
  strings: SectionStrings;
}) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const [renameState, renameAction, isRenaming] = useActionState(
    renameGallerySectionAction.bind(null, slug, section.id),
    undefined,
  );

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-4">
      <form action={renameAction} className="flex flex-col gap-3 md:flex-row">
        <input
          name="name"
          required
          defaultValue={section.name}
          className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="secondary" disabled={isRenaming}>
            {strings.saveName}
          </Button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(strings.deleteConfirm)) {
                startTransition(async () => {
                  await deleteGallerySectionAction(slug, section.id);
                  router.refresh();
                });
              }
            }}
            disabled={isDeleting}
            className="rounded-full border border-[#e5b7b7] bg-[#fff0eb] px-4 py-2 text-sm font-semibold text-[#8a1c1c]"
          >
            {strings.deleteButton}
          </button>
        </div>
      </form>
      {renameState?.error ? <p className="mt-3 text-sm text-[#8a1c1c]">{renameState.error}</p> : null}
    </div>
  );
}
