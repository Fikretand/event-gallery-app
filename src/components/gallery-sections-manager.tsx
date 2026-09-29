"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { createGallerySectionAction, deleteGallerySectionAction, renameGallerySectionAction } from "@/lib/actions";
import type { GallerySectionRecord } from "@/lib/types";
import type { Dict } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";

type SectionStrings = Dict["dashboard"]["sections"];

/** `{{name}}` interpolation, local so the dictionary helpers stay out of the client bundle. */
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

/**
 * Sections as a row of chips — name and file count — above the files they
 * organise. One chip opens at a time for renaming or deleting; "+ New
 * section" opens the same small form empty. It used to be a full-width form
 * per section, which pushed the files themselves a screen further down.
 */
export function GallerySectionsManager({
  slug,
  sections,
  counts = {},
  strings: s,
}: {
  slug: string;
  sections: GallerySectionRecord[];
  /** Files per section id, shown on each chip. */
  counts?: Record<string, number>;
  strings: SectionStrings;
}) {
  const router = useRouter();
  // null: nothing open · "new": adding · otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const current = sections.find((section) => section.id === editing) ?? null;

  function open(id: string | null) {
    setError(null);
    setEditing((value) => (value === id ? null : id));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = current
        ? await renameGallerySectionAction(slug, current.id, undefined, formData)
        : await createGallerySectionAction(slug, undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function remove() {
    if (!current || !window.confirm(s.deleteConfirm)) return;
    startTransition(async () => {
      await deleteGallerySectionAction(slug, current.id);
      setEditing(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => {
          const isOpen = editing === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => open(section.id)}
              aria-expanded={isOpen}
              aria-label={fill(s.editLabel, { name: section.name })}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                isOpen
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                  : "border-black/10 bg-white text-[var(--color-ink)] hover:border-black/25",
              )}
            >
              {section.name}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  isOpen ? "bg-white/18 text-white" : "bg-[var(--color-paper)] text-black/55",
                )}
              >
                {counts[section.id] ?? 0}
              </span>
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden className="opacity-55">
                <path d="M11 2.5l2.5 2.5L6 12.5H3.5V10z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => open("new")}
          aria-expanded={editing === "new"}
          className={cn(
            "rounded-full border border-dashed px-4 py-2 text-sm font-semibold transition",
            editing === "new"
              ? "border-[var(--color-accent)] bg-[#fff6f1] text-[var(--color-accent)]"
              : "border-black/20 text-black/60 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
          )}
        >
          {s.newSection}
        </button>
      </div>

      {sections.length === 0 && editing === null ? <p className="text-sm leading-6 text-black/55">{s.empty}</p> : null}

      {editing !== null ? (
        <form
          key={editing}
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-[20px] border border-black/10 bg-[var(--color-paper)]/55 p-3 sm:flex-row sm:items-center"
        >
          <input
            name="name"
            required
            autoFocus
            defaultValue={current?.name ?? ""}
            placeholder={s.addPlaceholder}
            className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/15"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-full bg-[var(--color-ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60 sm:flex-none"
            >
              {isPending ? s.adding : current ? s.saveName : s.addButton}
            </button>
            {current ? (
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="flex-1 rounded-full border border-[#e5b7b7] bg-[#fff0eb] px-4 py-2.5 text-sm font-semibold text-[#8a1c1c] disabled:opacity-60 sm:flex-none"
              >
                {s.deleteButton}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => open(editing)}
              className="flex-1 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/60 sm:flex-none"
            >
              {s.cancel}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="rounded-2xl bg-[#fff0eb] px-4 py-2.5 text-sm text-[#8a1c1c]">{error}</p> : null}
    </div>
  );
}
