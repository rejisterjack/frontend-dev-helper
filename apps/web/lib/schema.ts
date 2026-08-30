import type { ToolPageData } from "@/data/tools";
import {
  SITE_NAME,
  SITE_URL,
  GITHUB_URL,
  GITHUB_RELEASES_URL,
} from "@/lib/site";

type JsonLdObject = Record<string, unknown>;

function softwareApplication(overrides: JsonLdObject = {}): JsonLdObject {
  return {
    "@type": "SoftwareApplication",
    name: `${SITE_NAME} Browser Extension`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Chrome, Firefox, Edge, Brave",
    description: `A free and open-source Manifest V3 browser extension bundling 50 professional visual debugging tools for frontend developers: CSS overlays, accessibility audits, performance profiling, DOM inspection, and AI-assisted fixes. All processing runs locally in the browser.`,
    url: SITE_URL,
    ...(GITHUB_URL ? { sameAs: [GITHUB_URL] } : {}),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
    featureList: [
      "CSS Debugger with box model, flexbox and grid overlays",
      "WCAG 2.1 accessibility auditing with on-page overlays",
      "Performance profiler with Core Web Vitals tracking",
      "DOM inspector, component tree for React/Vue/Angular/Svelte",
      "Color picker, contrast checker, and design token extractor",
      "Command palette, session replay, and site report generator",
    ],
    ...overrides,
  };
}

export function organizationSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    ...(GITHUB_URL ? { sameAs: [GITHUB_URL] } : {}),
  };
}

export function webSiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function homePageSchema(faq: {
  question: string;
  answer: string;
}[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...organizationSchema(),
        "@id": `${SITE_URL}/#organization`,
      },
      {
        ...webSiteSchema(),
        "@id": `${SITE_URL}/#website`,
      },
      {
        ...softwareApplication(),
        "@id": `${SITE_URL}/#softwareapplication`,
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export function toolPageSchema(tool: ToolPageData): JsonLdObject {
  const toolUrl = `${SITE_URL}/tools/${tool.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...softwareApplication({
          name: `${tool.name} — ${SITE_NAME}`,
          description: tool.metaDescription || tool.description,
          url: toolUrl,
          ...(GITHUB_RELEASES_URL
            ? { installUrl: GITHUB_RELEASES_URL }
            : {}),
        }),
        "@id": `${toolUrl}#softwareapplication`,
      },
      {
        "@type": "HowTo",
        "@id": `${toolUrl}#howto`,
        name: `How to use the ${tool.name}`,
        description: tool.tagline,
        step: tool.howItWorks.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.description,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${toolUrl}#faq`,
        mainEntity: tool.faq.map((item) => (
          {
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          }
        )),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${toolUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tools",
            item: `${SITE_URL}/#tools`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: tool.name,
            item: toolUrl,
          },
        ],
      },
    ],
  };
}

export function blogPostSchema(post: {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
  author?: string;
}): JsonLdObject {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${postUrl}#article`,
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        url: postUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
        author: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
        ...(post.tags?.length ? { keywords: post.tags.join(", ") } : {}),
      },
    ],
  };
}

export function comparisonPageSchema(comparison: {
  slug: string;
  name: string;
  description: string;
}): JsonLdObject {
  const pageUrl = `${SITE_URL}/compare/${comparison.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: comparison.name,
        description: comparison.description,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#softwareapplication` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Comparisons",
            item: `${SITE_URL}/compare`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: comparison.name,
            item: pageUrl,
          },
        ],
      },
    ],
  };
}
