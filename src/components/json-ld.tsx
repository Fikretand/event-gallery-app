import { serializeJsonLd } from "@/lib/structured-data";

/** A schema.org block for crawlers. Renders nothing visible. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
