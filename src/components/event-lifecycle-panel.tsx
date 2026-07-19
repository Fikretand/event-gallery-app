"use client";

import { useTransition } from "react";

import { permanentlyDeleteEventAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/lib/i18n/index";

export function EventLifecyclePanel({
  slug,
  strings,
}: {
  slug: string;
  strings: Dict["dashboard"]["lifecycle"];
}) {
  const [isPending, startTransition] = useTransition();

  function handlePermanentDelete() {
    const confirmed = window.confirm(strings.deleteConfirm);
    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      await permanentlyDeleteEventAction(slug);
    });
  }

  return (
    <div>
      <Button variant="danger" disabled={isPending} onClick={handlePermanentDelete}>
        {isPending ? strings.deleting : strings.deletePermanently}
      </Button>
    </div>
  );
}
