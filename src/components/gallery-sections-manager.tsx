"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createGallerySectionAction, deleteGallerySectionAction, renameGallerySectionAction } from "@/lib/actions";
import type { GallerySectionRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function GallerySectionsManager({
  slug,
  sections,
}: {
  slug: string;
  sections: GallerySectionRecord[];
}) {
  const [createState, createAction, isCreating] = useActionState(createGallerySectionAction.bind(null, slug), undefined);

  return (
    <div className="space-y-4">
      <form action={createAction} className="flex flex-col gap-3 rounded-[24px] border border-black/10 bg-white p-4 md:flex-row">
        <input
          name="name"
          required
          placeholder="Add a gallery section like Ceremony or Reception"
          className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20"
        />
        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Adding..." : "Add section"}
        </Button>
      </form>

      {createState?.error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{createState.error}</div> : null}

      {sections.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-black/10 bg-white/70 px-5 py-8 text-sm leading-6 text-black/58">
          Create sections like Ceremony, Restaurant, or Photoshoot to organize the client-facing gallery.
        </div>
      ) : (
        <div className="grid gap-3">
          {sections.map((section) => (
            <SectionRow key={section.id} slug={slug} section={section} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRow({
  slug,
  section,
}: {
  slug: string;
  section: GallerySectionRecord;
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
            Save name
          </Button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this section? Files will stay in the gallery and move back to the unsectioned view.")) {
                startTransition(async () => {
                  await deleteGallerySectionAction(slug, section.id);
                  router.refresh();
                });
              }
            }}
            disabled={isDeleting}
            className="rounded-full border border-[#e5b7b7] bg-[#fff0eb] px-4 py-2 text-sm font-semibold text-[#8a1c1c]"
          >
            Delete
          </button>
        </div>
      </form>
      {renameState?.error ? <p className="mt-3 text-sm text-[#8a1c1c]">{renameState.error}</p> : null}
    </div>
  );
}
