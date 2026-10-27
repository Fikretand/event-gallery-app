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
                  ? "border-ink bg-ink text-white"
                  : "border-rule bg-card text-ink hover:border-rule-2",
              )}
            >
              {section.name}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  isOpen ? "bg-white/18 text-white" : "bg-paper-2 text-ink-2",
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
              ? "border-accent bg-paper-2 text-accent"
              : "border-rule-2 text-ink-2 hover:border-accent hover:text-accent",
          )}
        >
          {s.newSection}
        </button>
      </div>

      {sections.length === 0 && editing === null ? <p className="text-sm leading-6 text-ink-2">{s.empty}</p> : null}

      {editing !== null ? (
        <form
          key={editing}
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-[var(--radius-inner)] border border-rule bg-paper-2/55 p-3 sm:flex-row sm:items-center"
        >
          <input
            name="name"
            required
            autoFocus
            defaultValue={current?.name ?? ""}
            placeholder={s.addPlaceholder}
            className="min-w-0 flex-1 rounded-full border border-rule bg-card px-4 py-2.5 text-sm outline-none transition-colors focus:border-ink focus:ring-4 focus:ring-accent/15"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-sm btn-ink"
            >
              {isPending ? s.adding : current ? s.saveName : s.addButton}
            </button>
            {current ? (
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="flex-1 rounded-full border border-error-soft bg-error-soft px-4 py-2.5 text-sm font-semibold text-error disabled:opacity-60 sm:flex-none"
              >
                {s.deleteButton}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => open(editing)}
              className="btn btn-sm btn-secondary"
            >
              {s.cancel}
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="rounded-[var(--radius-inner)] bg-error-soft px-4 py-2.5 text-sm text-error">{error}</p> : null}
    </div>
  );
}
