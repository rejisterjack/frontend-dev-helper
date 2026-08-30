# SEO & AIO Strategy — FrontendDevHelper

> Owner: web app (`apps/web`). Companion scorecard: [`docs/seo-kpi.md`](./seo-kpi.md).
> Last updated: 2026-08-30. Review cadence: quarterly.

This document covers four areas: (1) traditional SEO, (2) Generative Engine
Optimization for LLM/AI discovery, (3) content & semantic strategy, and
(4) performance metrics. Everything in Phases 1–4 below is **implemented**
in this repository; Phase 5 is an ongoing operational program.

---

## 1. Traditional SEO

### 1.1 On-page (implemented)

| Surface | What shipped | Where |
| --- | --- | --- |
| Structured data | `SoftwareApplication` + `FAQPage` + `HowTo` + `BreadcrumbList` `@graph` on every tool page | [`lib/schema.ts`](../apps/web/lib/schema.ts) |
| Home schema | `Organization` + `WebSite` + `SoftwareApplication` + `FAQPage` | [`lib/schema.ts`](../apps/web/lib/schema.ts) |
| Canonicals | Every indexable page emits `alternates.canonical` | tool/blog/compare/home pages |
| Breadcrumbs | Visual + JSON-LD on tool, blog, and compare pages | page components |
| Citable answers | "At a glance" definition block on all 58 tool pages | `tool-page-content.tsx` |

**Why `FAQPage` + `HowTo`:** Google's FAQ and HowTo rich results are
deprecated for most sites, but the markup still feeds structured
understanding for LLM ingestion and Knowledge Graph reconciliation. It
costs nothing and helps machines, so it stays.

### 1.2 Technical (implemented)

- **Sitemap** ([`app/sitemap.ts`](../apps/web/app/sitemap.ts)): 58 tool
  pages, 7 comparison pages, blog posts, static routes — real
  `lastModified` dates via per-content `updatedAt` fields.
- **robots.txt** ([`app/robots.ts`](../apps/web/app/robots.ts)):
  marketing content open, `/api/` and `/dashboard` closed.
- **Rendering**: every indexable page is SSG (`generateStaticParams`) —
  crawlers get complete HTML with zero JS execution. Verified in CI.
- **Performance**: Lighthouse CI gates perf ≥ 0.8, SEO ≥ 0.9,
  accessibility ≥ 0.9 ([`lighthouserc.cjs`](../apps/web/lighthouserc.cjs)).
- **Regression protection**: `test/seo.test.ts` (18 unit tests) validates
  schema graphs, JSON serializability, llms.txt completeness, and
  cross-file slug integrity; `e2e/landing.spec.ts` asserts JSON-LD,
  canonicals, robots, sitemap, and llms.txt render in production.

### 1.3 Off-page (operational program — Phase 5)

Priority-ordered backlog. Because LLMs form recommendations from training
corpora plus retrieval, presence on high-authority developer platforms is
as important as the site itself.

1. **Chrome Web Store listing** — keyword-rich name and description
   ("CSS debugger", "accessibility checker", "visual debugging"),
   screenshots per tool category. This is both a distribution channel and
   a high-DA link.
2. **Firefox Add-ons (AMO)** — already live; enrich the description to
   mirror CWS keywords.
3. **GitHub as an SEO asset** — README structure, repo topics
   (`chrome-extension`, `css-debugger`, `accessibility`, `web-development`),
   GitHub Pages docs surface.
4. **Awesome-lists** — PRs to awesome-browser-extensions,
   awesome-web-development, awesome-a11y, awesome-css. One merged PR is a
   durable, contextually-relevant link.
5. **Directories** — AlternativeTo (strong "X alternative" intent
   capture), Slant, tools.dev, Chrome extension directories.
6. **Community seeding** — Stack Overflow answers on debugging questions
   where a tool genuinely solves the problem; r/webdev, r/css, r/reactjs
   posts that follow each subreddit's self-promotion rules; Show HN launch.
7. **Cross-publishing** — dev.to/Medium mirrors of blog posts with
   `rel=canonical` back to frontenddevhelper.com.
8. **MCP registry** — list the vendored chrome-devtools-mcp server in MCP
   directories; AI-native discovery channel that overlaps with our user base.

**Link policy:** no paid links, no link farms, no PBNs. Every placement
must be contextually legitimate — the comparison pages are honest for the
same reason: fake superiority is detectable by users and LLMs alike.

---

## 2. Generative Engine Optimization (GEO / AIO)

### 2.1 Machine-readable site map (implemented)

[`lib/llms-txt.ts`](../apps/web/lib/llms-txt.ts) generates, at build time
from the same data that renders the site:

- `/llms.txt` — curated summary: what the product is, key facts (price,
  browsers, license), all 58 tools with one-line descriptions and URLs.
- `/llms-full.txt` — complete reference: full descriptions, features,
  how-it-works steps, and FAQs for every tool.
- `/.well-known/llms.txt` — same content at the spec-preferred path.

Single source of truth: both the HTML pages and the plain-text exports
derive from [`data/tools.ts`](../apps/web/data/tools.ts), so they can
never drift out of sync.

### 2.2 AI crawler access (implemented)

[`app/robots.ts`](../apps/web/app/robots.ts) explicitly allows
`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-Web`,
`anthropic-ai`, `PerplexityBot`, `Perplexity-User`, `Google-Extended`,
`CCBot`, `Bytespider`, `Applebot-Extended`, `cohere-ai`, with `/api/` and
`/dashboard` still disallowed. Explicit rules prevent any future default
policy from silently blocking AI ingestion.

### 2.3 Citable content patterns (implemented)

LLMs quote self-contained passages, not pages. Every tool page opens with
an "At a glance" block — a 2–3 sentence definition ("X is a visual
debugging tool built into...") that stands alone when extracted. Blog
posts follow the same pattern: definition-first opening, tables for
reference facts, explicit conclusions.

### 2.4 Freshness and entropy signals

- Sitemap `lastModified` reflects real content dates.
- Blog cadence (below) gives crawlers a reason to re-fetch.
- `updatedAt` fields on tools and posts are the source for both.

---

## 3. Content & Semantic Strategy

### 3.1 Topical clusters (blog live at `/blog`)

Each cluster builds authority around a tool category; each post
deep-links to 2–4 `/tools/*` pages, and tool pages link back to relevant
posts — the internal-linking flywheel.

| Cluster | Seed posts (live) | Planned |
| --- | --- | --- |
| CSS debugging | How to debug flexbox alignment issues | Z-index stacking contexts; CSS Grid track debugging |
| Accessibility | WCAG contrast requirements explained | Keyboard focus debugging; WCAG 2.2 delta guide |
| Performance | — | Debugging INP; React wasted renders |
| Workflow | Replacing 12 legacy dev extensions | Using Chrome DevTools with AI agents; extension security audit |

**Cadence:** 2 posts/month. Every post must (a) answer a real query,
(b) link to tool pages, (c) be factually verifiable — no AI-slop.

### 3.2 Comparison hub (live at `/compare`)

Seven honest alternatives pages — Pesticide, WhatFont, ColorZilla, WAVE,
axe DevTools, VisBug, React Developer Tools — each with a feature table
and a verdict that names where the competitor **wins**. Captures
high-intent "{tool} alternative" searches without manufactured
superiority claims.

### 3.3 Semantic structure

- One H1 per page; section headings map to the content hierarchy.
- `SoftwareApplication` feature lists expose capabilities as entities.
- Internal links use descriptive anchors (never "click here").
- Tool slugs are stable identifiers across sitemap, llms.txt, and
  schema — enforced by `test/seo.test.ts`.

---

## 4. Performance Metrics & KPIs

Full targets and tracking cadence live in [`docs/seo-kpi.md`](./seo-kpi.md).
Summary:

**Traditional search** — Google Search Console clicks/impressions/position
per tool-page cluster; non-brand organic sessions (Plausible); rankings
for "chrome extension {tool}" and "{competitor} alternative" patterns;
Core Web Vitals (Lighthouse CI-gated).

**AI discovery** — AI-referral sessions by source (utm convention);
`/llms.txt` + `/llms-full.txt` fetch volume; monthly citation check
across ChatGPT, Perplexity, and Gemini on a fixed prompt battery; GitHub
star/clone velocity as a leading indicator of AI recommendation.

**Health gates (CI-enforced)** — schema validity (unit), JSON-LD/canonical/
robots/sitemap/llms.txt presence (e2e), Lighthouse budgets.

---

## Appendix: where things live

| Asset | Path |
| --- | --- |
| Schema builders (pure, testable) | `apps/web/lib/schema.ts` |
| JSON-LD React component | `apps/web/components/seo/json-ld.tsx` |
| Site-wide constants (URLs, AI crawler list) | `apps/web/lib/site.ts` |
| llms.txt generators | `apps/web/lib/llms-txt.ts` |
| Tool page data (58 tools) | `apps/web/data/tools.ts` |
| Landing FAQ (UI + schema source) | `apps/web/data/landing-faq.ts` |
| Comparison data | `apps/web/data/comparisons.ts` |
| Blog content | `apps/web/content/blog/` |
| Blog loader | `apps/web/lib/blog.ts` |
| SEO unit tests | `apps/web/test/seo.test.ts` |
| SEO e2e tests | `apps/web/e2e/landing.spec.ts` |
