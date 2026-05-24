import { SourceMapConsumer } from 'source-map';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceLocation {
  source: string;
  line: number;
  column: number;
  name?: string;
}

export interface ResolvedSource {
  originalPosition: SourceLocation | null;
  generatedPosition: { line: number; column: number } | null;
  sourceContent: string | null;
}

export interface SourceMapInfo {
  url: string;
  sourceMapUrl: string;
  sources: string[];
  hasContent: boolean;
}

// ---------------------------------------------------------------------------
// Consumer cache
// ---------------------------------------------------------------------------

const consumerCache = new Map<string, SourceMapConsumer>();

async function getConsumer(sourceMapUrl: string): Promise<SourceMapConsumer | null> {
  if (consumerCache.has(sourceMapUrl)) {
    return consumerCache.get(sourceMapUrl)!;
  }

  try {
    let rawText: string;

    if (sourceMapUrl.startsWith('data:application/json;base64,')) {
      const base64 = sourceMapUrl.split(',')[1];
      rawText = atob(base64);
    } else if (sourceMapUrl.startsWith('data:')) {
      rawText = decodeURIComponent(sourceMapUrl.split(',')[1]);
    } else {
      const response = await fetch(sourceMapUrl, { mode: 'cors' });
      if (!response.ok) {
        console.warn(`[FDH SourceMap] Failed to fetch ${sourceMapUrl}: ${response.status}`);
        return null;
      }
      rawText = await response.text();
    }

    const rawSourceMap = JSON.parse(rawText);
    const consumer = await new SourceMapConsumer(rawSourceMap);
    consumerCache.set(sourceMapUrl, consumer);
    return consumer;
  } catch (err) {
    console.warn(`[FDH SourceMap] Error parsing source map ${sourceMapUrl}:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function getBaseUrl(): string {
  return document.baseURI || location.href;
}

// ---------------------------------------------------------------------------
// Scanning for source maps
// ---------------------------------------------------------------------------

const SOURCE_MAP_RE = /\/\/[#@]\s*sourceMappingURL\s*=\s*(\S+)\s*$/;
const CSS_SOURCE_MAP_RE = /\/\*#\s*sourceMappingURL\s*=\s*(\S+)\s*\*\//;

// Cache for fetched content to avoid duplicate network requests
const contentCache = new Map<string, string>();

async function fetchContent(url: string): Promise<string | null> {
  if (contentCache.has(url)) return contentCache.get(url)!;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const text = await response.text();
    contentCache.set(url, text);
    return text;
  } catch {
    return null;
  }
}

function extractSourceMapUrlFromHeaders(url: string): string | null {
  // We can't read response headers from content scripts for cross-origin resources,
  // but we can check for the SourceMap header via a fetch. This is done inline
  // in the fetch functions below rather than here since we need the Response object.
  return null;
}

/**
 * Parse sourceMappingURL from content (JS or CSS)
 */
function parseSourceMapRef(content: string, isCss: boolean): string | null {
  const re = isCss ? CSS_SOURCE_MAP_RE : SOURCE_MAP_RE;
  const match = content.match(re);
  return match ? match[1] : null;
}

export function findSourceMapUrls(): SourceMapInfo[] {
  const results: SourceMapInfo[] = [];
  const baseUrl = getBaseUrl();
  const seen = new Set<string>();

  // Inline scripts may contain //# sourceMappingURL= comments
  const inlineScripts = document.querySelectorAll('script:not([src])');
  inlineScripts.forEach((script) => {
    const text = script.textContent || '';
    const mapRef = parseSourceMapRef(text, false);
    if (!mapRef) return;

    const sourceMapUrl = mapRef.startsWith('data:') ? mapRef : resolveUrl(baseUrl, mapRef);
    const key = 'inline:' + sourceMapUrl;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      url: '(inline script)',
      sourceMapUrl,
      sources: [],
      hasContent: false,
    });
  });

  // External <script src="..."> — guess .map as fallback
  // (async discovery happens in discoverExternalSourceMaps)
  const scripts = document.querySelectorAll('script[src]');
  scripts.forEach((script) => {
    const src = (script as HTMLScriptElement).src;
    if (!src || seen.has(src)) return;
    seen.add(src);

    const possibleMapUrl = src + '.map';
    results.push({
      url: src,
      sourceMapUrl: possibleMapUrl,
      sources: [],
      hasContent: false,
    });
  });

  // <link rel="stylesheet"> — guess .map as fallback
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  stylesheets.forEach((link) => {
    const href = (link as HTMLLinkElement).href;
    if (!href || seen.has(href)) return;
    seen.add(href);

    const possibleMapUrl = href + '.map';
    results.push({
      url: href,
      sourceMapUrl: possibleMapUrl,
      sources: [],
      hasContent: false,
    });
  });

  return results;
}

/**
 * Async source map discovery: fetches external script/stylesheet content
 * and reads actual sourceMappingURL directives. Returns an updated list
 * with accurate source map URLs.
 */
export async function discoverExternalSourceMaps(): Promise<SourceMapInfo[]> {
  const results: SourceMapInfo[] = [];
  const baseUrl = getBaseUrl();
  const seen = new Set<string>();

  // Discover from inline scripts (synchronous, already known)
  const inlineScripts = document.querySelectorAll('script:not([src])');
  inlineScripts.forEach((script) => {
    const text = script.textContent || '';
    const mapRef = parseSourceMapRef(text, false);
    if (!mapRef) return;

    const sourceMapUrl = mapRef.startsWith('data:') ? mapRef : resolveUrl(baseUrl, mapRef);
    const key = 'inline:' + sourceMapUrl;
    if (seen.has(key)) return;
    seen.add(key);

    results.push({
      url: '(inline script)',
      sourceMapUrl,
      sources: [],
      hasContent: false,
    });
  });

  // Discover from external scripts
  const scripts = document.querySelectorAll('script[src]');
  const scriptPromises = Array.from(scripts).map(async (script) => {
    const src = (script as HTMLScriptElement).src;
    if (!src || seen.has(src)) return null;
    seen.add(src);

    // Try fetching the script content to find actual sourceMappingURL
    const content = await fetchContent(src);
    if (content) {
      const mapRef = parseSourceMapRef(content, false);
      if (mapRef) {
        const sourceMapUrl = mapRef.startsWith('data:')
          ? mapRef
          : resolveUrl(src, mapRef);
        return { url: src, sourceMapUrl, sources: [], hasContent: false } as SourceMapInfo;
      }
    }

    // Fallback: also try SourceMap header via fetch
    try {
      const headResponse = await fetch(src, { method: 'HEAD', mode: 'cors' });
      const headerMap = headResponse.headers.get('SourceMap') || headResponse.headers.get('X-SourceMap');
      if (headerMap) {
        const sourceMapUrl = headerMap.startsWith('data:')
          ? headerMap
          : resolveUrl(src, headerMap);
        return { url: src, sourceMapUrl, sources: [], hasContent: false } as SourceMapInfo;
      }
    } catch {
      // HEAD request failed, ignore
    }

    // Final fallback: guess .map
    return { url: src, sourceMapUrl: src + '.map', sources: [], hasContent: false } as SourceMapInfo;
  });

  const scriptResults = await Promise.all(scriptPromises);
  for (const r of scriptResults) {
    if (r) results.push(r);
  }

  // Discover from external stylesheets
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
  const cssPromises = Array.from(stylesheets).map(async (link) => {
    const href = (link as HTMLLinkElement).href;
    if (!href || seen.has(href)) return null;
    seen.add(href);

    const content = await fetchContent(href);
    if (content) {
      const mapRef = parseSourceMapRef(content, true);
      if (mapRef) {
        const sourceMapUrl = mapRef.startsWith('data:')
          ? mapRef
          : resolveUrl(href, mapRef);
        return { url: href, sourceMapUrl, sources: [], hasContent: false } as SourceMapInfo;
      }
    }

    // Fallback: guess .map
    return { url: href, sourceMapUrl: href + '.map', sources: [], hasContent: false } as SourceMapInfo;
  });

  const cssResults = await Promise.all(cssPromises);
  for (const r of cssResults) {
    if (r) results.push(r);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Enrich SourceMapInfo with actual source map contents
// ---------------------------------------------------------------------------

export async function enrichSourceMapInfo(info: SourceMapInfo): Promise<SourceMapInfo | null> {
  const consumer = await getConsumer(info.sourceMapUrl);
  if (!consumer) return null;

  const sources: string[] = (consumer as unknown as { sources: string[] }).sources ?? [];
  const hasContent = sources.some((s: string) => consumer.sourceContentFor(s, true) !== null);

  return {
    ...info,
    sources,
    hasContent,
  };
}

// ---------------------------------------------------------------------------
// Position resolution
// ---------------------------------------------------------------------------

export async function resolvePosition(
  sourceMapUrl: string,
  line: number,
  column: number,
): Promise<SourceLocation | null> {
  const consumer = await getConsumer(sourceMapUrl);
  if (!consumer) return null;

  const pos = consumer.originalPositionFor({ line, column });
  if (!pos || !pos.source) return null;

  return {
    source: pos.source,
    line: pos.line ?? 0,
    column: pos.column ?? 0,
    name: pos.name ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Source content retrieval
// ---------------------------------------------------------------------------

export async function getSourceContent(
  sourceMapUrl: string,
  sourceFile: string,
): Promise<string | null> {
  const consumer = await getConsumer(sourceMapUrl);
  if (!consumer) return null;

  return consumer.sourceContentFor(sourceFile, true) ?? null;
}

// ---------------------------------------------------------------------------
// Full resolved position info
// ---------------------------------------------------------------------------

export async function resolveSource(
  sourceMapUrl: string,
  line: number,
  column: number,
): Promise<ResolvedSource | null> {
  const consumer = await getConsumer(sourceMapUrl);
  if (!consumer) return null;

  const originalPos = consumer.originalPositionFor({ line, column });
  const originalPosition: SourceLocation | null =
    originalPos && originalPos.source
      ? {
          source: originalPos.source,
          line: originalPos.line ?? 0,
          column: originalPos.column ?? 0,
          name: originalPos.name ?? undefined,
        }
      : null;

  const sourceContent = originalPosition
    ? (consumer.sourceContentFor(originalPosition.source, true) ?? null)
    : null;

  return {
    originalPosition,
    generatedPosition: { line, column },
    sourceContent,
  };
}

// ---------------------------------------------------------------------------
// Stack trace resolution
// ---------------------------------------------------------------------------

const STACK_LINE_RE =
  /^\s*at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?\s*$/;

export async function resolveStackTrace(stackTrace: string): Promise<string> {
  const lines = stackTrace.split('\n');
  const results: string[] = [];

  // Collect all unique source map URLs from the known set
  const knownMaps = findSourceMapUrls();

  for (const line of lines) {
    const match = line.match(STACK_LINE_RE);
    if (!match) {
      results.push(line);
      continue;
    }

    const [, funcName, filePath, lineStr, colStr] = match;
    const genLine = parseInt(lineStr, 10);
    const genCol = parseInt(colStr, 10);

    // Find a matching source map for this file path
    let resolved: SourceLocation | null = null;

    for (const info of knownMaps) {
      // Check if the file path matches the URL
      let fileName = '';
      try {
        fileName = new URL(info.url).pathname.split('/').pop() || '';
      } catch {
        fileName = info.url.split('/').pop() || '';
      }
      if (!filePath.endsWith(fileName) && !info.url.includes(filePath)) {
        continue;
      }

      resolved = await resolvePosition(info.sourceMapUrl, genLine, genCol);
      if (resolved) break;
    }

    if (resolved) {
      const fn = funcName || resolved.name || '<anonymous>';
      results.push(`    at ${fn} (${resolved.source}:${resolved.line}:${resolved.column})`);
    } else {
      results.push(line);
    }
  }

  return results.join('\n');
}

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

export function clearCache(): void {
  for (const consumer of consumerCache.values()) {
    try {
      consumer.destroy();
    } catch {
      // Some versions may not have destroy
    }
  }
  consumerCache.clear();
  contentCache.clear();
}
