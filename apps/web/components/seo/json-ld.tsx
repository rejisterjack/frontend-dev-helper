/**
 * Renders a schema.org JSON-LD block. Server component only — structured
 * data must ship in the static HTML so crawlers never depend on hydration.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
