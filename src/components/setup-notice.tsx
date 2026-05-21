import { Panel } from "@/components/ui/panel";
import { missingEnvMessage } from "@/lib/env";

export function SetupNotice() {
  return (
    <Panel className="mx-auto max-w-2xl bg-white/92">
      <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Project setup required</h2>
      <p className="mt-3 text-sm leading-6 text-black/65">{missingEnvMessage()}</p>
      <p className="mt-3 text-sm leading-6 text-black/65">
        The scaffold, UI, SQL schema, route handlers, and storage integrations are already in place. Add your
        environment variables and database schema to activate the live flows.
      </p>
    </Panel>
  );
}
