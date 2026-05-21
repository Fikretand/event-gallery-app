"use client";

import { useTransition } from "react";

import { permanentlyDeleteEventAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function EventLifecyclePanel({ slug }: { slug: string }) {
  const [isPending, startTransition] = useTransition();

  function handlePermanentDelete() {
    const confirmed = window.confirm("Permanently delete this event and all files from storage? This cannot be undone.");
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
        {isPending ? "Deleting..." : "Delete permanently"}
      </Button>
    </div>
  );
}
