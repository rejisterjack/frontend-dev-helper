import { describe, it, expect } from "vitest";
import { allTools } from "@/data/tools";
import { allComparisons } from "@/data/comparisons";
import { landingFaqs } from "@/data/landing-faq";
import {
  homePageSchema,
  toolPageSchema,
  blogPostSchema,
  comparisonPageSchema,
} from "@/lib/schema";
import { buildLlmsTxt, buildLlmsFullTxt } from "@/lib/llms-txt";
import { SITE_URL } from "@/lib/site";

/** A valid @graph must parse and contain only serializable entries. */
function graphTypes(data: Record<string, unknown>): string[] {
  const graph = data["@graph"];
  if (!Array.isArray(graph)) throw new Error("missing @graph array");
  return graph.map(
    (entry) => (entry as Record<string, unknown>)["@type"] as string,
  );
}

describe("homePageSchema", () => {
  const schema = homePageSchema(landingFaqs);

  it("includes Organization, WebSite, SoftwareApplication, FAQPage", () => {
    expect(graphTypes(schema)).toEqual([
      "Organization",
      "WebSite",
      "SoftwareApplication",
      "FAQPage",
    ]);
  });

  it("serializes to valid JSON with @context", () => {
    const parsed = JSON.parse(JSON.stringify(schema));
    expect(parsed["@context"]).toBe("https://schema.org");
  });

  it("FAQPage has one Question per landing FAQ item", () => {
    const faq = (schema["@graph"] as Array<Record<string, unknown>>).find(
      (e) => e["@type"] === "FAQPage",
    );
    const mainEntity = faq?.mainEntity as Array<Record<string, unknown>>;
    expect(mainEntity).toHaveLength(landingFaqs.length);
    for (const q of mainEntity) {
      expect(q["@type"]).toBe("Question");
      expect(q.name).toBeTruthy();
      const answer = q.acceptedAnswer as Record<string, unknown>;
      expect(answer.text).toBeTruthy();
    }
  });

  it("SoftwareApplication is free", () => {
    const app = (schema["@graph"] as Array<Record<string, unknown>>).find(
      (e) => e["@type"] === "SoftwareApplication",
    );
    expect(app?.isAccessibleForFree).toBe(true);
    const offers = app?.offers as Record<string, unknown>;
    expect(offers.price).toBe("0");
  });
});

describe("toolPageSchema", () => {
  it("builds a valid graph for every tool", () => {
    for (const tool of allTools) {
      const schema = toolPageSchema(tool);
      expect(graphTypes(schema)).toEqual([
        "SoftwareApplication",
        "HowTo",
        "FAQPage",
        "BreadcrumbList",
      ]);
      // Must be JSON-serializable (no undefined/functions leaking in).
      JSON.parse(JSON.stringify(schema));
    }
  });

  it("HowTo step count matches tool.howItWorks", () => {
    const tool = allTools[0];
    const schema = toolPageSchema(tool);
    const howto = (schema["@graph"] as Array<Record<string, unknown>>).find(
      (e) => e["@type"] === "HowTo",
    );
    const steps = howto?.step as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(tool.howItWorks.length);
    steps.forEach((s, i) => expect(s.position).toBe(i + 1));
  });

  it("BreadcrumbList points at the tool URL", () => {
    const tool = allTools[0];
    const schema = toolPageSchema(tool);
    const crumb = (schema["@graph"] as Array<Record<string, unknown>>).find(
      (e) => e["@type"] === "BreadcrumbList",
    );
    const items = crumb?.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(3);
    expect(items[2].item).toBe(`${SITE_URL}/tools/${tool.slug}`);
  });
});

describe("blogPostSchema", () => {
  it("emits BlogPosting with dates and URL", () => {
    const schema = blogPostSchema({
      slug: "test-post",
      title: "Test",
      description: "d",
      date: "2026-08-01T00:00:00.000Z",
      tags: ["css"],
    });
    const graph = schema["@graph"] as Array<Record<string, unknown>>;
    expect(graph[0]["@type"]).toBe("BlogPosting");
    expect(graph[0].url).toBe(`${SITE_URL}/blog/test-post`);
    expect(graph[0].datePublished).toBe("2026-08-01T00:00:00.000Z");
    expect(graph[0].keywords).toBe("css");
  });
});

describe("comparisonPageSchema", () => {
  it("emits WebPage + BreadcrumbList for every comparison", () => {
    for (const c of allComparisons) {
      const schema = comparisonPageSchema({
        slug: c.slug,
        name: c.metaTitle,
        description: c.description,
      });
      expect(graphTypes(schema)).toEqual(["WebPage", "BreadcrumbList"]);
      JSON.parse(JSON.stringify(schema));
    }
  });
});

describe("llms.txt generators", () => {
  it("lists every tool with its URL", () => {
    const txt = buildLlmsTxt();
    expect(txt).toContain("# FrontendDevHelper");
    for (const tool of allTools) {
      expect(txt).toContain(`${SITE_URL}/tools/${tool.slug}`);
    }
  });

  it("llms-full includes FAQ answers for every tool", () => {
    const txt = buildLlmsFullTxt();
    for (const tool of allTools) {
      expect(txt).toContain(`## ${tool.name}`);
      for (const item of tool.faq) {
        expect(txt).toContain(item.question);
      }
    }
  });

  it("references the llms-full companion file", () => {
    expect(buildLlmsTxt()).toContain("/llms-full.txt");
  });
});

describe("sitemap integrity", () => {
  it("every tool slug is unique", () => {
    const slugs = allTools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every comparison relatedToolSlug resolves to a real tool", () => {
    const toolSlugs = new Set(allTools.map((t) => t.slug));
    for (const c of allComparisons) {
      for (const slug of c.relatedToolSlugs) {
        expect(toolSlugs.has(slug)).toBe(true);
      }
    }
  });
});
