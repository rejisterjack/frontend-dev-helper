import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allTools, getToolBySlug, getRelatedTools } from '@/data/tools';
import ToolPageContent from './tool-page-content';
import { JsonLd } from '@/components/seo/json-ld';
import { toolPageSchema } from '@/lib/schema';
import { SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return allTools.map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const tool = getToolBySlug(slug);
    if (!tool) return { title: 'Tool Not Found' };
    return {
      title: tool.metaTitle,
      description: tool.metaDescription,
      alternates: { canonical: `/tools/${tool.slug}` },
      openGraph: {
        title: tool.metaTitle,
        description: tool.metaDescription,
        url: `${SITE_URL}/tools/${tool.slug}`,
        type: 'website',
      },
    };
  });
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) notFound();
  const related = getRelatedTools(tool.relatedTools);
  return (
    <>
      <JsonLd data={toolPageSchema(tool)} />
      <ToolPageContent tool={tool} relatedTools={related} />
    </>
  );
}
