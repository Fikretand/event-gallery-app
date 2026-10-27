import { Panel } from "@/components/ui/panel";
import { missingEnvMessage } from "@/lib/env";

export function SetupNotice() {
  return (
    <Panel className="mx-auto max-w-2xl bg-card">
      <h2 className="text-2xl font-semibold text-ink">Project setup required</h2>
      <p className="mt-3 text-sm leading-6 text-ink-2">{missingEnvMessage()}</p>
      <p className="mt-3 text-sm leading-6 text-ink-2">
        The scaffold, UI, SQL schema, route handlers, and storage integrations are already in place. Add your
        environment variables and database schema to activate the live flows.
      </p>
    </Panel>
  );
}
