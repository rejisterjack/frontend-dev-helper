import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
// `useMDXComponents` is the export name Next.js requires in
// mdx-components.tsx, but our implementation is a plain function, not a
// React hook — alias it so the rules-of-hooks lint doesn't misfire.
import { useMDXComponents as getMdxComponents } from "@/mdx-components";
import { Container } from "@/components/ui/container";
import { JsonLd } from "@/components/seo/json-ld";
import { blogPostSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/site";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = getPostBySlug(slug);
    if (!post) return { title: "Post Not Found" };
    return {
      title: post.title,
      description: post.description,
      alternates: { canonical: `/blog/${post.slug}` },
      openGraph: {
        title: post.title,
        description: post.description,
        url: `${SITE_URL}/blog/${post.slug}`,
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.updatedAt ?? post.date,
        tags: post.tags,
      },
    };
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || post.draft) notFound();

  const { default: Post } = await import(`@/content/blog/${post.slug}.mdx`);

  return (
    <>
      <JsonLd
        data={blogPostSchema({
          slug: post.slug,
          title: post.title,
          description: post.description,
          date: post.date,
          tags: post.tags,
          author: post.author,
        })}
      />
      <article className="pb-20 pt-32 md:pt-40">
        <Container size="narrow">
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
                  href="/blog"
                  className="transition-colors hover:text-text-secondary"
                >
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-text-secondary">
                {post.title}
              </li>
            </ol>
          </nav>

          <header className="mt-8">
            <h1 className="text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-text-tertiary">
              {post.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-text-muted">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {post.tags.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                  {post.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-line-subtle px-2 py-0.5 text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </div>
          </header>

          <div className="mt-10">
            <Post components={getMdxComponents({})} />
          </div>

          <div className="mt-16 border-t border-line-subtle pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All posts
            </Link>
          </div>
        </Container>
      </article>
    </>
  );
}
