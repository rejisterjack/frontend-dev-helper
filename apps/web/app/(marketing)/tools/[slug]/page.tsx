import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allTools, getToolBySlug, getRelatedTools } from '@/data/tools';
import ToolPageContent from './tool-page-content';

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
      openGraph: { title: tool.metaTitle, description: tool.metaDescription },
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
  return <ToolPageContent tool={tool} relatedTools={related} />;
}
