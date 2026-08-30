import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, getAllTags } from "@/lib/blog";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Card } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog — Frontend Debugging Guides | FrontendDevHelper",
  description:
    "Practical guides on CSS debugging, accessibility auditing, performance profiling, and frontend workflow from the FrontendDevHelper team.",
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  const tags = getAllTags();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${SITE_URL}/blog#blog`,
          name: "FrontendDevHelper Blog",
          url: `${SITE_URL}/blog`,
          description:
            "Frontend debugging guides: CSS, accessibility, performance, and workflow.",
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: `${SITE_URL}/blog/${p.slug}`,
            datePublished: p.date,
          })),
        }}
      />
      <section className="pb-20 pt-32 md:pt-40">
        <Container>
          <div className="max-w-3xl">
            <Eyebrow tone="brand">Blog</Eyebrow>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              Debugging guides &amp; workflow notes.
            </h1>
            <p className="mt-5 text-lg text-text-tertiary">
              Practical writing on CSS bugs, accessibility requirements,
              performance profiling, and the tools that make them faster to
              fix.
            </p>
          </div>

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-line-subtle px-3 py-1 text-xs text-text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card variant="interactive" className="h-full p-6">
                  <time className="text-xs text-text-muted" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <h2 className="mt-2 text-lg font-semibold text-text-primary">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
                    {post.description}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-bg-elevated px-2 py-0.5 text-[11px] text-text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {posts.length === 0 && (
            <p className="mt-12 text-text-tertiary">
              No posts yet — check back soon.
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
