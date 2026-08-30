import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  tags: string[];
  author?: string;
  draft?: boolean;
}

export interface BlogPostWithContent extends BlogPost {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

function parseMdxFile(filePath: string, slug: string): BlogPostWithContent {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: new Date(data.date ?? Date.now()).toISOString(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString() : undefined,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    author: data.author ? String(data.author) : undefined,
    draft: Boolean(data.draft),
    content,
  };
}

export function getAllPosts(): BlogPostWithContent[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseMdxFile(path.join(CONTENT_DIR, f), f.replace(/\.mdx$/, "")))
    .filter((p) => !p.draft)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Metadata-only list for sitemaps and index pages (no file body read). */
export const allPosts: BlogPost[] = getAllPosts().map(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({ content: _content, ...meta }) => meta,
);

export function getPostBySlug(slug: string): BlogPostWithContent | undefined {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;
  return parseMdxFile(filePath, slug);
}

export function getLatestPostDate(): Date {
  const posts = getAllPosts();
  if (!posts.length) return new Date();
  return new Date(
    posts.reduce(
      (latest, p) =>
        +new Date(p.updatedAt ?? p.date) > +latest
          ? new Date(p.updatedAt ?? p.date)
          : latest,
      new Date(posts[0].date),
    ),
  );
}

export function getAllTags(): string[] {
  return Array.from(new Set(getAllPosts().flatMap((p) => p.tags))).sort();
}
