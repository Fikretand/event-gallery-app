"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { updateEventCopyAction } from "@/lib/actions";
import type { CopyGroup } from "@/lib/custom-copy";
import type { Dict } from "@/lib/i18n/index";
import { cn } from "@/lib/utils";

type Strings = Omit<Dict["dashboard"]["event"]["copyEditor"], "fields">;

export type CopyEditorField = {
  key: string;
  group: CopyGroup;
  multiline?: boolean;
  max: number;
  label: string;
  /** The standard text, shown inside the empty field. */
  standard: string;
  /** The owner's own text, or "" for the standard one. */
  value: string;
};

/** `{{name}}` interpolation, local so the dictionary helpers stay out of the client bundle. */
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ""));
}

/**
 * Every text a guest reads, grouped by the screen it appears on. An empty
 * field shows the standard text as its placeholder and keeps it; typing
 * replaces it for this event only.
 */
export function GalleryCopyEditor({
  slug,
  fields,
  groups,
  strings: s,
  galleryUrl,
  uploadUrl,
}: {
  slug: string;
  fields: CopyEditorField[];
  groups: readonly CopyGroup[];
  strings: Strings;
  galleryUrl: string;
  uploadUrl: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.value])),
  );
  const [active, setActive] = useState<CopyGroup>(groups[0]);
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [isSaving, startSave] = useTransition();

  const customPerGroup = useMemo(() => {
    const counts: Partial<Record<CopyGroup, number>> = {};
    for (const field of fields) {
      if (values[field.key]?.trim()) counts[field.group] = (counts[field.group] ?? 0) + 1;
    }
    return counts;
  }, [fields, values]);
  const customTotal = Object.values(customPerGroup).reduce((sum, n) => sum + (n ?? 0), 0);

  function update(key: string, value: string) {
    setStatus("idle");
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Every field goes, not just the visible group, so switching tabs never loses an edit.
    const formData = new FormData();
    for (const field of fields) formData.set(field.key, values[field.key] ?? "");
    startSave(async () => {
      try {
        const result = await updateEventCopyAction(slug, formData);
        setStatus("ok" in result ? "saved" : "failed");
        if ("ok" in result) router.refresh();
      } catch {
        setStatus("failed");
      }
    });
  }

  const inputClass =
    "w-full rounded-[var(--radius-inner)] border border-rule bg-card px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-ink focus:ring-4 focus:ring-accent/15";

  return (
    <form onSubmit={submit} className="space-y-5">
      <div role="tablist" aria-label={s.title} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {groups.map((group) => {
          const isActive = group === active;
          const count = customPerGroup[group] ?? 0;
          return (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(group)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                isActive
                  ? "bg-ink text-white"
                  : "border border-rule bg-card text-ink hover:bg-paper-2",
              )}
            >
              {s.groups[group]}
              {count ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    isActive ? "bg-white/18" : "bg-accent-soft text-accent",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="grid gap-4 md:grid-cols-2">
        {fields
          .filter((field) => field.group === active)
          .map((field) => {
            const value = values[field.key] ?? "";
            const id = `copy-${field.key}`;
            return (
              <div key={field.key} className={cn("flex flex-col gap-1.5", field.multiline && "md:col-span-2")}>
                <div className="flex items-end justify-between gap-3">
                  <label htmlFor={id} className="text-sm font-semibold text-ink">
                    {field.label}
                  </label>
                  {value ? (
                    <button
                      type="button"
                      onClick={() => update(field.key, "")}
                      className="shrink-0 text-xs font-semibold text-accent hover:underline"
                    >
                      ↺ {s.reset}
                    </button>
                  ) : null}
                </div>
                {field.multiline ? (
                  <textarea
                    id={id}
                    rows={3}
                    maxLength={field.max}
                    value={value}
                    placeholder={field.standard}
                    onChange={(event) => update(field.key, event.target.value)}
                    className={cn(inputClass, "resize-y leading-6", value && "border-accent/40 bg-paper-2")}
                  />
                ) : (
                  <input
                    id={id}
                    maxLength={field.max}
                    value={value}
                    placeholder={field.standard}
                    onChange={(event) => update(field.key, event.target.value)}
                    className={cn(inputClass, value && "border-accent/40 bg-paper-2")}
                  />
                )}
              </div>
            );
          })}
      </div>

      {status !== "idle" ? (
        <p
          role="status"
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-medium",
            status === "saved" ? "bg-moss-soft text-moss" : "bg-error-soft text-error",
          )}
        >
          {status === "saved" ? s.saved : s.failed}
        </p>
      ) : null}

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-[var(--radius-inner)] border border-rule bg-card p-2.5 pl-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-ink-2">{fill(s.customCount, { count: customTotal })}</span>
          <a href={galleryUrl} target="_blank" rel="noopener noreferrer" className="hidden font-semibold text-ink hover:underline sm:inline">
            {s.previewGallery}
          </a>
          <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="hidden font-semibold text-ink hover:underline sm:inline">
            {s.previewGuests}
          </a>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-sm btn-primary shrink-0"
        >
          {isSaving ? s.saving : s.save}
        </button>
      </div>

    </form>
  );
}
