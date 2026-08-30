import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allComparisons, getComparisonBySlug } from "@/data/comparisons";
import { getRelatedTools } from "@/data/tools";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { comparisonPageSchema } from "@/lib/schema";
import { SITE_URL, DOWNLOAD_URL } from "@/lib/site";
import { ArrowLeft, ArrowRight, Check, Minus, Download } from "lucide-react";

export function generateStaticParams() {
  return allComparisons.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const c = getComparisonBySlug(slug);
    if (!c) return { title: "Comparison Not Found" };
    return {
      title: c.metaTitle,
      description: c.metaDescription,
      alternates: { canonical: `/compare/${c.slug}` },
      openGraph: {
        title: c.metaTitle,
        description: c.metaDescription,
        url: `${SITE_URL}/compare/${c.slug}`,
        type: "website",
      },
    };
  });
}

function CellValue({ value }: { value: string | boolean }) {
  if (value === true)
    return <Check className="h-4 w-4 text-brand-cyan" aria-label="Yes" />;
  if (value === false)
    return <Minus className="h-4 w-4 text-text-muted" aria-label="No" />;
  return <span className="text-sm text-text-secondary">{value}</span>;
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comparison = getComparisonBySlug(slug);
  if (!comparison) notFound();
  const related = getRelatedTools(comparison.relatedToolSlugs);

  return (
    <>
      <JsonLd
        data={comparisonPageSchema({
          slug: comparison.slug,
          name: comparison.metaTitle,
          description: comparison.description,
        })}
      />
      <div className="pb-20">
        <section className="pt-32 md:pt-40">
          <Container>
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-2 text-sm text-text-muted">
                <li>
                  <Link
                    href="/"
                    className="transition-colors hover:text-text-secondary"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href="/compare"
                    className="transition-colors hover:text-text-secondary"
                  >
                    Comparisons
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-text-secondary">
                  {comparison.name}
                </li>
              </ol>
            </nav>

            <div className="mt-8 max-w-3xl">
              <Eyebrow tone="brand">Comparison</Eyebrow>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
                {comparison.name} alternative
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-text-tertiary">
                {comparison.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href={DOWNLOAD_URL} size="lg">
                  <Download className="h-4 w-4" />
                  Install free
                </Button>
                <Button href="#comparison" variant="secondary" size="lg">
                  See the table
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Container>
        </section>

        <section id="comparison" className="section-y mt-16 border-y border-line-subtle">
          <Container>
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              FrontendDevHelper vs {comparison.name}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Honest feature comparison. &ldquo;No&rdquo; means the capability
              isn&rsquo;t offered — not that it&rsquo;s bad.
            </p>
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line-subtle">
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">
                      Feature
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">
                      FrontendDevHelper
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-primary">
                      {comparison.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.feature} className="border-b border-line-subtle">
                      <td className="px-4 py-3 text-text-secondary">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3">
                        <CellValue value={row.us} />
                      </td>
                      <td className="px-4 py-3">
                        <CellValue value={row.them} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Card className="mt-10 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-text-primary">
                The honest verdict
              </h3>
              <p className="mt-3 leading-relaxed text-text-secondary">
                {comparison.verdict}
              </p>
            </Card>
          </Container>
        </section>

        {related.length > 0 && (
          <section className="section-y">
            <Container>
              <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
                Tools that replace {comparison.name}&rsquo;s workflow
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {related.map((t) => (
                  <Link key={t.slug} href={`/tools/${t.slug}`}>
                    <Card
                      variant="interactive"
                      className="flex items-center justify-between p-5"
                    >
                      <div>
                        <h3 className="font-medium text-text-primary">
                          {t.name}
                        </h3>
                        <p className="mt-0.5 text-sm text-text-tertiary">
                          {t.tagline}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
                    </Card>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}

        <section className="section-y border-t border-line-subtle">
          <Container>
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All comparisons
            </Link>
          </Container>
        </section>
      </div>
    </>
  );
}
