import {
  findSourceMapUrls,
  discoverExternalSourceMaps,
  getSourceContent,
  resolvePosition,
  enrichSourceMapInfo,
} from './source-map-resolver';
import { getBridge } from './vscode-bridge';

export interface CSSSourceLocation {
  file: string;
  line: number;
  column: number;
}

// ---------------------------------------------------------------------------
// Find the source location of a CSS rule for a given element + property
// ---------------------------------------------------------------------------

export async function resolveCSSSource(
  element: HTMLElement,
  property: string,
): Promise<CSSSourceLocation | null> {
  const matchedRules = findMatchingRules(element);
  if (matchedRules.length === 0) return null;

  // Use async discovery for accurate source map URLs
  const maps = await discoverExternalSourceMaps();
  const syncMaps = findSourceMapUrls();
  const allMaps = [...maps, ...syncMaps];
  const seenUrls = new Set<string>();
  const uniqueMaps = allMaps.filter((m) => {
    if (seenUrls.has(m.sourceMapUrl)) return false;
    seenUrls.add(m.sourceMapUrl);
    return true;
  });
  const cssMaps = uniqueMaps.filter(
    (m) => m.url.includes('.css') || m.sourceMapUrl.includes('.css'),
  );

  for (const rule of matchedRules) {
    const hasProperty = tryFindPropertyInRule(rule, property);
    if (!hasProperty) continue;

    const parentSheet = rule.parentStyleSheet;
    if (!parentSheet) continue;

    const href = parentSheet.href;
    if (!href) continue;

    // Find matching source map
    for (const info of cssMaps) {
      if (
        !info.url.includes(href) &&
        !href.includes(info.url.replace('.map', ''))
      )
        continue;

      // Strategy 1: Use source map position resolution (accurate)
      const posResult = await trySourceMapPosition(info, rule, property);
      if (posResult) return posResult;

      // Strategy 2: Text search fallback (less precise)
      const enriched = await enrichSourceMapInfo(info);
      if (!enriched) continue;

      for (const source of enriched.sources) {
        const content = await getSourceContent(info.sourceMapUrl, source);
        if (!content) continue;

        const lineNum = findSelectorInContent(
          content,
          rule.selectorText,
          property,
        );
        if (lineNum > 0) {
          return { file: source, line: lineNum, column: 0 };
        }
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Try resolving CSS rule position via source map
// ---------------------------------------------------------------------------

async function trySourceMapPosition(
  info: { sourceMapUrl: string; url: string },
  rule: CSSStyleRule,
  property: string,
): Promise<CSSSourceLocation | null> {
  // Try to get the generated line/column for the property declaration.
  // The CSSStyleRule doesn't expose position directly, but we can try
  // to use the rule index to approximate the position within the stylesheet.
  // For now, we check if the enriched source map has a matching selector+property
  // and use resolvePosition with a best-effort generated position.

  // Get the stylesheet text to find the rule position
  try {
    const response = await fetch(info.url, { mode: 'cors' });
    if (!response.ok) return null;
    const text = await response.text();

    // Find the selector in the generated CSS
    const selector = rule.selectorText;
    const selectorIdx = text.indexOf(selector);
    if (selectorIdx === -1) return null;

    // Calculate line/column from character offset
    const beforeSelector = text.slice(0, selectorIdx);
    const genLine =
      (beforeSelector.match(/\n/g) || []).length + 1;
    const lastNewline = beforeSelector.lastIndexOf('\n');
    const genCol =
      lastNewline === -1 ? selectorIdx + 1 : selectorIdx - lastNewline;

    // Find the property within this rule block
    const afterSelector = text.slice(selectorIdx);
    const openBrace = afterSelector.indexOf('{');
    if (openBrace === -1) return null;

    const ruleBody = afterSelector.slice(openBrace + 1);
    const closeBrace = ruleBody.indexOf('}');
    if (closeBrace === -1) return null;

    // Find the property in the rule body
    const propPattern = new RegExp(
      `^\\s*${escapeRegex(property)}\\s*:`,
      'm',
    );
    const propMatch = ruleBody.slice(0, closeBrace).match(propPattern);
    if (!propMatch || propMatch.index === undefined) return null;

    const propOffset = openBrace + 1 + propMatch.index;
    const beforeProp = text.slice(0, selectorIdx + propOffset);
    const propLine =
      (beforeProp.match(/\n/g) || []).length + 1;
    const propLastNewline = beforeProp.lastIndexOf('\n');
    const propCol =
      propLastNewline === -1
        ? selectorIdx + propOffset + 1
        : selectorIdx + propOffset - propLastNewline;

    // Resolve via source map
    const resolved = await resolvePosition(
      info.sourceMapUrl,
      propLine,
      propCol,
    );
    if (resolved && resolved.source) {
      return {
        file: resolved.source,
        line: resolved.line,
        column: resolved.column,
      };
    }

    // Also try resolving the selector start position
    const selResolved = await resolvePosition(info.sourceMapUrl, genLine, genCol);
    if (selResolved && selResolved.source) {
      // We know the selector location but not the exact property line.
      // Return the selector location as best-effort.
      return {
        file: selResolved.source,
        line: selResolved.line,
        column: selResolved.column,
      };
    }
  } catch {
    return null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Find matching CSS rules for an element
// ---------------------------------------------------------------------------

function findMatchingRules(element: HTMLElement): CSSStyleRule[] {
  const rules: CSSStyleRule[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const sheetRules = sheet.cssRules ?? sheet.rules;
      if (!sheetRules) continue;

      for (const rule of Array.from(sheetRules)) {
        if (!(rule instanceof CSSStyleRule)) continue;

        try {
          if (element.matches(rule.selectorText)) {
            rules.push(rule);
          }
        } catch {
          // Invalid selector, skip
        }
      }
    } catch {
      // Cross-origin stylesheet, skip
    }
  }

  return rules;
}

function tryFindPropertyInRule(rule: CSSStyleRule, property: string): boolean {
  try {
    return rule.style.getPropertyValue(property) !== '';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Search source content for a selector + property pair (fallback)
// ---------------------------------------------------------------------------

function findSelectorInContent(
  content: string,
  selector: string,
  property: string,
): number {
  const lines = content.split('\n');
  const selectors = selector.split(',').map((s) => s.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const sel of selectors) {
      if (line.includes(sel.trim())) {
        for (
          let j = i;
          j < Math.min(i + 50, lines.length);
          j++
        ) {
          if (lines[j].includes('}')) break;
          if (
            lines[j].includes(property + ':') ||
            lines[j].includes(property + ' :')
          ) {
            return j + 1;
          }
        }
      }
    }
  }

  return 0;
}

// ---------------------------------------------------------------------------
// Convenience: resolve + jump
// ---------------------------------------------------------------------------

export async function jumpToCSSSource(
  element: HTMLElement,
  property: string,
): Promise<boolean> {
  const source = await resolveCSSSource(element, property);
  if (!source) return false;

  const bridge = getBridge();
  if (!bridge.connected) return false;

  bridge.jumpToSource(source.file, source.line, source.column);
  return true;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
