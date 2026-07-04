import type { LLMConfig, LLMMessage } from "./types";
import type { PageContextData } from "./messaging/types";
import { getProvider } from "./providers";
import { getSecret } from "./secrets";

const CACHE_DURATION_MS = 5 * 60 * 1000;

const DEFAULT_LLM_CONFIG: LLMConfig = {
  apiKey: "",
  model: "openai/gpt-4o-mini",
  baseUrl: "https://openrouter.ai/api/v1",
  maxTokens: 2000,
  temperature: 0.3,
  enabled: false,
  provider: "openrouter",
};

let config: LLMConfig = { ...DEFAULT_LLM_CONFIG };
const analysisCache = new Map<
  string,
  { result: unknown[]; timestamp: number }
>();

export async function loadConfig(): Promise<LLMConfig> {
  try {
    const result = await browser.storage.local.get("fdh-settings-storage");
    const settings = (
      result["fdh-settings-storage"] as { state?: any } | undefined
    )?.state;
    if (settings?.ai) {
      // The API key lives in encrypted-at-rest storage (lib/secrets.ts).
      // settings.ai.apiKey is the legacy plaintext field, kept empty after
      // migration; fall back to it once for a graceful upgrade path.
      const encryptedKey = await getSecret("aiApiKey");
      const legacyKey = settings.ai.apiKey || "";
      const apiKey = encryptedKey || legacyKey;
      config = {
        ...DEFAULT_LLM_CONFIG,
        apiKey,
        model: settings.ai.model || "openai/gpt-4o-mini",
        baseUrl: settings.ai.baseUrl || "https://openrouter.ai/api/v1",
        enabled: settings.ai.enabled || false,
        provider: settings.ai.provider || "openrouter",
      };
    }
    return config;
  } catch {
    return config;
  }
}

export async function saveConfig(newConfig: Partial<LLMConfig>): Promise<void> {
  config = { ...config, ...newConfig };
  // Phase 1.3: write through to the canonical fdh-settings-storage key used by
  // loadConfig + useSettingsStore. The legacy 'fdh-llm-config' key was an
  // orphan — loadConfig never read it — so writing here kept a phantom entry
  // in chrome.storage.local that nothing ever consumed.
  //
  // The API key continues to live in encrypted-at-rest storage via secrets.ts;
  // never persist it to fdh-settings-storage in plaintext.
  if (newConfig.apiKey !== undefined) {
    const { setSecret } = await import("./secrets");
    await setSecret("aiApiKey", newConfig.apiKey);
  }
  await browser.storage.local.set({
    "fdh-settings-storage": {
      state: {
        ai: {
          enabled: config.enabled,
          apiKey: "", // sensitive — stored in secrets.ts, never here
          model: config.model,
          baseUrl: config.baseUrl,
          provider: config.provider,
        },
      },
    },
  });
}

export function getConfig(): LLMConfig {
  return { ...config };
}

export function isEnabled(): boolean {
  const provider = getProvider(config.provider);
  if (provider.name === "ollama") {
    return config.enabled;
  }
  return config.enabled && !!config.apiKey;
}

async function sendRequest(messages: LLMMessage[]): Promise<string | null> {
  const provider = getProvider(config.provider);
  // Enforce a default 60s timeout so a hung LLM provider doesn't keep the
  // extension waiting forever. AbortSignal.timeout() is supported in Chrome
  // ≥103. If unsupported, the request simply has no timeout (graceful).
  let signal: AbortSignal | undefined;
  try {
    signal = AbortSignal.timeout(60_000);
  } catch {
    signal = undefined;
  }
  return provider.sendMessage(
    {
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
    },
    messages,
    signal,
  );
}

export async function analyzePage(context: {
  url: string;
  title: string;
  domStats: {
    totalElements: number;
    images: number;
    links: number;
    headings: number;
  };
  techStack: string[];
}): Promise<unknown[] | null> {
  const cacheKey = `${context.url}:${context.domStats.totalElements}`;
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.result;
  }

  if (!isEnabled()) return null;

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `You are a frontend development expert analyzing web pages. Provide analysis in JSON format:
{"suggestions":[{"category":"accessibility|performance|seo|best-practice|security","priority":"critical|high|medium|low","title":"Issue title","description":"What's wrong","impact":"Why it matters","effort":"easy|medium|hard","suggestedFix":"How to fix"}]}
Focus on actionable, high-impact issues. Limit to 5-10 suggestions.`,
    },
    {
      role: "user",
      content: `Analyze this page:\nURL: ${context.url}\nTitle: ${context.title}\nTech: ${context.techStack.join(", ") || "Unknown"}\nElements: ${context.domStats.totalElements}, Images: ${context.domStats.images}, Links: ${context.domStats.links}, Headings: ${context.domStats.headings}`,
    },
  ];

  const content = await sendRequest(messages);
  if (!content) return null;

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || [
      null,
      content,
    ];
    const parsed = JSON.parse((jsonMatch[1] || content).trim());
    const suggestions = parsed.suggestions || [];

    analysisCache.set(cacheKey, { result: suggestions, timestamp: Date.now() });
    cleanupCache();
    return suggestions;
  } catch {
    return null;
  }
}

function buildDevToolsSystemPrompt(pageContext?: {
  url: string;
  title: string;
  viewport: string;
  techStack: string[];
  pageContext?: PageContextData;
}): string {
  const ctx = pageContext?.pageContext;
  const contextSection = ctx
    ? `
## Current Page Context (Live Data)

**URL:** ${ctx.url}
**Title:** ${ctx.title}
**Viewport:** ${ctx.viewport.width}x${ctx.viewport.height}
**Tech Stack:** ${ctx.techStack.join(", ") || "Unknown"}

### DOM Statistics
- Total elements: ${ctx.domStats.totalElements}
- Images: ${ctx.domStats.images} (${ctx.domStats.imagesWithoutAlt} without alt text)
- Links: ${ctx.domStats.links}
- Headings: ${ctx.domStats.headings}
- Forms: ${ctx.domStats.forms} (${ctx.domStats.inputsWithoutLabel} inputs without labels)
- Scripts: ${ctx.domStats.scripts}
- Stylesheets: ${ctx.domStats.stylesheets}

${ctx.headingHierarchy.length > 0 ? `### Heading Hierarchy\n${ctx.headingHierarchy.map((h) => `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}`).join("\n")}` : ""}

### Performance
- DOM Content Loaded: ${ctx.performance.domContentLoaded}ms
- Page Load: ${ctx.performance.loadComplete}ms
- DOM Interactive: ${ctx.performance.domInteractive}ms
- Transfer Size: ${(ctx.performance.transferSize / 1024).toFixed(1)}KB

### CSS
- Stylesheets: ${ctx.css.stylesheetCount}
- CSS Custom Properties: ${ctx.css.customPropertyCount}
- Inline Styles: ${ctx.css.inlineStyles}

### Storage
- localStorage keys: ${ctx.storage.localStorageKeys}
- sessionStorage keys: ${ctx.storage.sessionStorageKeys}
- Cookies: ${ctx.storage.cookieCount}

### Meta Tags
${
  Object.entries(ctx.meta)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n") || "None detected"
}

${
  ctx.consoleErrors.length > 0
    ? `### Console Errors\n${ctx.consoleErrors
        .slice(0, 10)
        .map((e) => `- ${e}`)
        .join("\n")}`
    : "### Console Errors: None detected"
}
`
    : `**Page:** ${pageContext?.url ?? "Unknown"} | ${pageContext?.title ?? ""} | ${pageContext?.viewport ?? ""}`;

  return `You are FrontendDevHelper AI, an expert browser DevTools assistant. You have deep knowledge of Chrome DevTools, Firefox Developer Tools, and web platform APIs. You help developers understand, debug, and optimize web pages by analyzing live page context.

${contextSection}

## Your Expertise Areas

### Console Analysis
- Interpret JavaScript errors, warnings, and logs
- Diagnose runtime exceptions and stack traces
- Identify deprecated API usage and browser compatibility issues
- Suggest debugging strategies using console APIs

### Network Analysis
- Interpret resource loading waterfalls and timings
- Diagnose slow requests, CORS issues, and failed loads
- Optimize caching strategies and payload sizes
- Analyze API request patterns and response handling

### Elements/DOM Analysis
- Explain DOM structure, nesting depth, and element relationships
- Identify DOM anti-patterns (deep nesting, excessive reflows)
- Analyze shadow DOM usage and Web Components
- Suggest semantic HTML improvements

### Performance Profiling
- Interpret Core Web Vitals (LCP, FID, CLS, INP, TTFB)
- Diagnose rendering bottlenecks and layout thrashing
- Identify long tasks and main thread blocking
- Suggest code splitting, lazy loading, and optimization strategies

### CSS/Rendering
- Debug layout issues (flexbox, grid, positioning)
- Analyze CSS specificity conflicts and cascade issues
- Identify unused CSS and optimization opportunities
- Explain paint/composite layer behavior

### Storage/Application
- Analyze cookie usage, flags, and security
- Inspect localStorage/sessionStorage patterns
- Debug Service Workers, Cache API, and PWA issues
- Identify IndexedDB usage patterns

### Accessibility
- Audit WCAG 2.1 compliance (A, AA, AAA)
- Identify keyboard navigation issues
- Check ARIA attributes and roles
- Analyze color contrast ratios and text readability
- Verify form labels, alt text, and heading hierarchy

### SEO
- Analyze meta tags, Open Graph, and structured data
- Check heading hierarchy and content structure
- Identify crawlability and indexability issues

## Response Guidelines
- Be specific and actionable — reference actual elements, selectors, or metrics from the page context
- Provide code examples when suggesting fixes
- Prioritize issues by impact (critical → low)
- Keep responses under 300 words unless the user asks for detail
- Use markdown formatting for code and emphasis
- When you don't have enough data, say so and suggest what to check in DevTools`;
}

export async function sendChatMessage(
  aiConfig: {
    apiKey: string;
    model: string;
    baseUrl: string;
    provider?: string;
  },
  messages: LLMMessage[],
  pageContext:
    | {
        url: string;
        title: string;
        viewport: string;
        techStack: string[];
        pageContext?: PageContextData;
      }
    | undefined,
  onChunk: (chunk: { content: string; done: boolean; error?: string }) => void,
  _signal?: AbortSignal,
): Promise<void> {
  const providerName = aiConfig.provider || "openrouter";
  const provider = getProvider(providerName);

  if (provider.name !== "ollama" && !aiConfig.apiKey) {
    onChunk({
      content: "",
      done: true,
      error: "AI not configured. Open Settings to add your API key.",
    });
    return;
  }

  const systemPrompt = buildDevToolsSystemPrompt(pageContext);
  const fullMessages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  await provider.sendStreamingMessage(
    {
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      baseUrl: aiConfig.baseUrl,
      maxTokens: 2000,
      temperature: 0.7,
    },
    fullMessages,
    onChunk,
    _signal,
  );
}

export async function testConnection(aiConfig: {
  apiKey: string;
  model: string;
  baseUrl: string;
  provider?: string;
}): Promise<{ success: boolean; message: string }> {
  const providerName = aiConfig.provider || "openrouter";
  const provider = getProvider(providerName);
  return provider.testConnection({
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    baseUrl: aiConfig.baseUrl,
    maxTokens: 2000,
    temperature: 0.3,
  });
}

/**
 * Send a single non-streaming request using the current global LLM config.
 *
 * Used by the React Profiler's AI suggestions panel — it doesn't need
 * streaming, doesn't need page context, and shouldn't carry its own provider
 * config (the user already configured the LLM in Settings).
 *
 * Returns the assistant's raw text response, or null if AI is disabled /
 * unconfigured / errored.
 */
export async function sendRawRequest(
  messages: LLMMessage[],
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string | null> {
  const cfg = getConfig();
  if (!isEnabled()) return null;

  const provider = getProvider(cfg.provider);
  return provider.sendMessage(
    {
      apiKey: cfg.apiKey,
      model: cfg.model,
      baseUrl: cfg.baseUrl,
      maxTokens: options.maxTokens ?? cfg.maxTokens,
      temperature: options.temperature ?? cfg.temperature,
    },
    messages,
  );
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION_MS) analysisCache.delete(key);
  }
}

export const llmService = {
  loadConfig,
  saveConfig,
  getConfig,
  isEnabled,
  analyzePage,
  sendChatMessage,
  testConnection,
  sendRawRequest,
};
