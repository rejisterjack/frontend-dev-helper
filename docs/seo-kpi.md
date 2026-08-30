# SEO/AIO KPI Scorecard

> Companion to [`docs/SEO_AIO_STRATEGY.md`](./SEO_AIO_STRATEGY.md).
> Update monthly. Baseline established 2026-08-30 (pre-launch of SEO program).

## Baseline (2026-08-30)

No Search Console property verified yet; no AI-referral data collected.
All numbers below are targets from a standing start.

---

## Traditional search

| KPI | Tool | Baseline | Q1 target | Q2 target |
| --- | --- | --- | --- | --- |
| Indexed pages | GSC | 0 verified | 60+ | 80+ |
| Organic clicks/mo | GSC | — | 500 | 2,000 |
| Impressions/mo | GSC | — | 20,000 | 80,000 |
| Non-brand organic sessions/mo | Plausible | — | 400 | 1,500 |
| Tool pages ranking top-20 | GSC | 0 | 10 | 25 |
| "{tool} chrome extension" in top-10 | GSC | 0 | 3 | 8 |
| "{competitor} alternative" in top-20 | GSC | 0 | 2 | 5 |
| Referring domains | any backlink tool | ~2 (GitHub, AMO) | 15 | 40 |

### Keyword clusters to track

Build GSC filtered views (or a sheet) per cluster:

1. **Tool-intent**: "css debugger extension", "accessibility checker chrome",
   "contrast checker extension", "performance profiler chrome" — one per
   high-traffic tool page.
2. **Alternative-intent**: "pesticide alternative", "whatfont alternative",
   "colorzilla alternative", "wave alternative", "axe devtools alternative".
3. **Brand**: "frontenddevhelper", "frontend dev helper".
4. **Informational** (blog): "debug flexbox alignment", "wcag contrast
   requirements", "wcag aa vs aaa".

---

## AI-driven discovery

| KPI | Tool | Baseline | Q1 target | Q2 target |
| --- | --- | --- | --- | --- |
| AI-referral sessions/mo | Plausible (referrers) | 0 | 30 | 150 |
| `/llms.txt` + `/llms-full.txt` fetches/mo | Plausible (page views) | 0 | 50 | 300 |
| Citation battery score | Monthly manual check | 0/12 | 3/12 | 6/12 |
| GitHub stars | GitHub | ~0 | 100 | 400 |

### Referrer names to watch in Plausible

chat.openai.com · chatgpt.com · perplexity.ai · gemini.google.com ·
copilot.microsoft.com · claude.ai · phind.com · you.com

### Citation battery (run monthly, first week)

Ask each of ChatGPT (with browsing), Perplexity, and Gemini the following.
Record cited/not-cited per engine in the table below.

1. "Best free Chrome extension for debugging CSS"
2. "Best free accessibility checker Chrome extension"
3. "Pesticide alternative"
4. "WhatFont alternative"
5. "How do I check WCAG contrast in the browser?"
6. "Open source visual debugging extension"
7. "Extension to visualize flexbox and grid"
8. "Free alternative to axe DevTools"
9. "Best color picker Chrome extension"
10. "How to debug INP"
11. "React component tree extension"
12. "Manifest V3 debugging extension"

| Prompt # | ChatGPT | Perplexity | Gemini | Notes |
| --- | --- | --- | --- | --- |
| 1–12 | — | — | — | Fill monthly |

### UTM convention

When sharing links in AI-answerable places (Reddit, Stack Overflow,
dev.to), append `?utm_source={platform}&utm_medium=answer&utm_campaign=seo`.
This keeps referral attribution clean in Plausible.

---

## Health gates (CI-enforced — should always pass)

| Gate | Where |
| --- | --- |
| Schema graphs valid + JSON-serializable for all 58 tools | `apps/web/test/seo.test.ts` |
| llms.txt lists every tool; llms-full includes all FAQs | `apps/web/test/seo.test.ts` |
| Comparison relatedToolSlugs resolve | `apps/web/test/seo.test.ts` |
| JSON-LD present in served HTML | `apps/web/e2e/landing.spec.ts` |
| Canonical on tool pages | `apps/web/e2e/landing.spec.ts` |
| robots.txt AI-crawler rules + sitemap link | `apps/web/e2e/landing.spec.ts` |
| sitemap includes tools/blog/compare | `apps/web/e2e/landing.spec.ts` |
| Lighthouse: SEO ≥ 0.9, a11y ≥ 0.9, perf ≥ 0.8 | `apps/web/lighthouserc.cjs` |

---

## Monthly checklist

- [ ] GSC: check coverage errors, submit sitemap if new page types
- [ ] GSC: record cluster-level clicks/impressions/position
- [ ] Plausible: record non-brand organic + AI referrals + llms.txt fetches
- [ ] Run the 12-prompt citation battery, update table
- [ ] One new blog post shipped minimum (target: two)
- [ ] One off-page action from strategy §1.3 completed
- [ ] Review GSC queries for emerging keywords worth a dedicated page
