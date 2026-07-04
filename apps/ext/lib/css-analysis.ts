// ---------------------------------------------------------------------------
// CSS Analysis Engine
// Shared utilities for specificity computation, cascade ordering,
// conflict detection, and variable dependency tracing.
// ---------------------------------------------------------------------------

export interface Specificity {
  a: number; // ID selectors
  b: number; // Class, attribute, pseudo-class selectors
  c: number; // Type, pseudo-element selectors
}

export interface CascadedRule {
  rule: CSSStyleRule;
  selector: string;
  specificity: Specificity;
  specificityScore: number;
  properties: Map<string, string>;
  isInline: boolean;
  isImportant: Set<string>;
  sourceIndex: number;
  // Cascade layer information. `layerOrder` is -1 for unlayered rules (which
  // ALWAYS win over layered rules in the cascade per CSS Cascade Layers spec).
  // Higher numbers = declared later = higher priority within layers.
  layerOrder: number;
  layerName: string | null;
}

export interface PropertyConflict {
  property: string;
  winner: CascadedRule;
  losers: CascadedRule[];
  winningValue: string;
  overriddenValues: Array<{ value: string; rule: CascadedRule }>;
}

export interface VariableNode {
  name: string;
  value: string;
  resolvedValue: string;
  dependencies: string[];
  source: string; // 'inline', 'stylesheet', 'inline-style'
}

// ---------------------------------------------------------------------------
// Specificity computation
// ---------------------------------------------------------------------------

const ID_RE = /#[a-zA-Z0-9_-]+/g;
const CLASS_ATTR_RE = /\.[a-zA-Z0-9_-]+|\[[^\]]+\]/g;
const PSEUDO_CLASS_RE = /:(?:where|is|matches|not)\(([^)]*)\)/g;
const NESTED_PSEUDO_RE = /:(?:nth-child|nth-of-type|has|dir|lang)\(([^)]*)\)/g;
const SIMPLE_PSEUDO_RE = /:[a-zA-Z-]+/g;
const TYPE_RE = /^[a-zA-Z][a-zA-Z0-9]*/;
const PSEUDO_ELEMENT_RE = /::[a-zA-Z-]+/g;

/**
 * Compute the (a, b, c) specificity tuple for a selector per the CSS spec.
 * Handles `:where()` (always 0,0,0), `:is()`/`:matches()`/`:not()` (use the
 * most specific argument), and pseudo-elements (count as type selectors).
 */
export function computeSpecificity(selector: string): Specificity {
  const spec: Specificity = { a: 0, b: 0, c: 0 };
  let work = selector;

  // :where(...) always contributes (0,0,0); strip it before counting.
  // :is / :matches / :not — their specificity equals the MOST specific
  // comma-separated argument (per CSS Selectors spec). We split on commas,
  // compute each, and merge the max.
  work = work.replace(PSEUDO_CLASS_RE, (whole, inner: string) => {
    const keyword = whole.slice(1).match(/^[a-zA-Z-]+/)?.[0] ?? "";
    if (/^where$/i.test(keyword)) {
      return ""; // :where — strip entirely, contributes nothing
    }
    const args = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    let best: Specificity = { a: 0, b: 0, c: 0 };
    for (const arg of args) {
      const argSpec = computeSpecificity(arg);
      if (
        argSpec.a > best.a ||
        (argSpec.a === best.a && argSpec.b > best.b) ||
        (argSpec.a === best.a && argSpec.b === best.b && argSpec.c > best.c)
      ) {
        best = argSpec;
      }
    }
    spec.a += best.a;
    spec.b += best.b;
    spec.c += best.c;
    return "";
  });

  // Pseudo-elements (::before, ::placeholder, etc.) count as one type (c).
  work = work.replace(PSEUDO_ELEMENT_RE, () => {
    spec.c++;
    return "";
  });

  // nth-child(...) etc. carry an argument that may contain a selector — but
  // the selector part contributes to specificity. For simplicity and to match
  // the common case, count the pseudo-class itself only; the bare type inside
  // `:nth-child(2n of .foo)` is rare.
  work = work.replace(NESTED_PSEUDO_RE, (whole, _inner: string) => {
    spec.b++;
    return whole; // keep for further parsing if needed
  });

  // Count ID selectors.
  const idMatches = work.match(ID_RE);
  if (idMatches) spec.a += idMatches.length;

  // Count class and attribute selectors.
  const classMatches = work.match(CLASS_ATTR_RE);
  if (classMatches) spec.b += classMatches.length;

  // Count simple pseudo-classes that remain (e.g. :hover).
  const simplePseudo = work.match(SIMPLE_PSEUDO_RE);
  if (simplePseudo) {
    for (const m of simplePseudo) {
      if (!m.startsWith("::")) spec.b++;
    }
  }

  // Count type selectors (the leading word in each compound).
  // We strip out everything that's already counted (ids, classes, attrs,
  // pseudos) so only the type tokens remain.
  const withoutCompoundMarkers = work
    .replace(ID_RE, " ")
    .replace(CLASS_ATTR_RE, " ")
    .replace(SIMPLE_PSEUDO_RE, " ")
    .replace(NESTED_PSEUDO_RE, " ");
  const parts = withoutCompoundMarkers.split(/[\s>+~]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Strip a leading * (universal) — it contributes 0 specificity.
    if (trimmed === "*") continue;
    const m = trimmed.match(TYPE_RE);
    if (m) spec.c++;
  }

  return spec;
}

export function specificityScore(s: Specificity): number {
  return s.a * 10000 + s.b * 100 + s.c;
}

export function specificityToString(s: Specificity): string {
  return `${s.a},${s.b},${s.c}`;
}

// ---------------------------------------------------------------------------
// Cascade: collect all rules matching an element
// ---------------------------------------------------------------------------

function collectMatchingRulesFromList(
  ruleList: CSSRuleList,
  element: HTMLElement,
  sourceIndex: number,
  rules: CascadedRule[],
  seenSelectors: Set<string>,
  layerOrder: { order: number; name: string | null } = { order: 0, name: null },
): void {
  for (let ri = 0; ri < ruleList.length; ri++) {
    const cssRule = ruleList[ri];
    if (cssRule instanceof CSSLayerBlockRule) {
      try {
        // Each layer gets a monotonically increasing order; nested layers
        // inherit the parent's name prefix.
        const childOrder = {
          order: layerOrder.order + 1,
          name: layerOrder.name
            ? `${layerOrder.name}.${cssRule.name}`
            : cssRule.name,
        };
        collectMatchingRulesFromList(
          cssRule.cssRules,
          element,
          sourceIndex,
          rules,
          seenSelectors,
          childOrder,
        );
      } catch {
        /* nested cross-origin */
      }
      continue;
    }
    if (cssRule instanceof CSSMediaRule || cssRule instanceof CSSSupportsRule) {
      try {
        collectMatchingRulesFromList(
          cssRule.cssRules,
          element,
          sourceIndex,
          rules,
          seenSelectors,
          layerOrder,
        );
      } catch {
        /* nested cross-origin */
      }
      continue;
    }
    if (!(cssRule instanceof CSSStyleRule)) continue;

    let matches = false;
    try {
      matches = element.matches(cssRule.selectorText);
    } catch {
      continue;
    }
    if (!matches) continue;

    const key = `${cssRule.selectorText}@${sourceIndex}:${layerOrder.name ?? ""}`;
    if (seenSelectors.has(key)) continue;
    seenSelectors.add(key);

    const selector = cssRule.selectorText;
    const specificity = computeSpecificity(selector);
    const properties = new Map<string, string>();
    const isImportant = new Set<string>();

    const style = cssRule.style;
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (!prop) continue;
      const value = style.getPropertyValue(prop);
      properties.set(prop, value);
      if (style.getPropertyPriority(prop) === "important") {
        isImportant.add(prop);
      }
    }

    rules.push({
      rule: cssRule,
      selector,
      specificity,
      specificityScore: specificityScore(specificity),
      properties,
      isInline: false,
      isImportant,
      sourceIndex,
      layerOrder: layerOrder.order,
      layerName: layerOrder.name,
    });
  }
}

export function collectCascadedRules(element: HTMLElement): CascadedRule[] {
  const rules: CascadedRule[] = [];
  const seenSelectors = new Set<string>();

  for (let si = 0; si < document.styleSheets.length; si++) {
    const sheet = document.styleSheets[si];
    let sheetRules: CSSRuleList;
    try {
      sheetRules = sheet.cssRules ?? sheet.rules;
      if (!sheetRules) continue;
    } catch {
      continue;
    }

    collectMatchingRulesFromList(sheetRules, element, si, rules, seenSelectors);
  }

  // Inline style (highest specificity)
  const inlineStyle = element.getAttribute("style");
  if (inlineStyle) {
    const properties = new Map<string, string>();
    const isImportant = new Set<string>();
    const tempEl = document.createElement("div");
    tempEl.style.cssText = inlineStyle;
    for (let i = 0; i < tempEl.style.length; i++) {
      const prop = tempEl.style[i];
      if (!prop) continue;
      properties.set(prop, tempEl.style.getPropertyValue(prop));
      if (tempEl.style.getPropertyPriority(prop) === "important") {
        isImportant.add(prop);
      }
    }

    if (properties.size > 0) {
      rules.push({
        rule: null as any,
        selector: "element.style",
        specificity: { a: 0, b: 0, c: 0 },
        specificityScore: Infinity,
        properties,
        isInline: true,
        isImportant,
        sourceIndex: -1,
        layerOrder: -1,
        layerName: null,
      });
    }
  }

  return rules;
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

export function detectConflicts(rules: CascadedRule[]): PropertyConflict[] {
  const propertyMap = new Map<
    string,
    Array<{ rule: CascadedRule; value: string; important: boolean }>
  >();

  for (const cascRule of rules) {
    for (const [prop, value] of cascRule.properties) {
      if (!propertyMap.has(prop)) propertyMap.set(prop, []);
      propertyMap.get(prop)!.push({
        rule: cascRule,
        value,
        important: cascRule.isImportant.has(prop),
      });
    }
  }

  const conflicts: PropertyConflict[] = [];
  for (const [property, entries] of propertyMap) {
    if (entries.length < 2) continue;

    const sorted = [...entries].sort((a, b) => {
      // Cascade per CSS Cascade spec, in priority order:
      //   1. !important wins over normal
      if (a.important !== b.important) return b.important ? 1 : -1;
      //   2. Within the same origin/importance, unlayered (-1) > layered.
      //      Among layered rules, later layer wins.
      const aLayer = a.rule.layerOrder;
      const bLayer = b.rule.layerOrder;
      const aUnlayered = aLayer === -1 || a.rule.isInline;
      const bUnlayered = bLayer === -1 || b.rule.isInline;
      if (aUnlayered !== bUnlayered) return bUnlayered ? 1 : -1;
      if (!aUnlayered && aLayer !== bLayer) return bLayer - aLayer;
      //   3. Specificity
      if (a.rule.specificityScore !== b.rule.specificityScore) {
        return b.rule.specificityScore - a.rule.specificityScore;
      }
      //   4. Order of appearance
      return b.rule.sourceIndex - a.rule.sourceIndex;
    });

    const winner = sorted[0];
    const losers = sorted.slice(1);

    const hasDifference = losers.some(
      (l) => l.value.trim() !== winner.value.trim(),
    );
    if (!hasDifference) continue;

    conflicts.push({
      property,
      winner: winner.rule,
      losers: losers.map((l) => l.rule),
      winningValue: winner.value,
      overriddenValues: losers.map((l) => ({
        value: l.value,
        rule: l.rule,
      })),
    });
  }

  return conflicts.sort((a, b) => a.property.localeCompare(b.property));
}

// ---------------------------------------------------------------------------
// Property cascade: for a specific property, get ordered rules
// ---------------------------------------------------------------------------

export function getPropertyCascade(
  rules: CascadedRule[],
  property: string,
): Array<{
  rule: CascadedRule;
  value: string;
  isWinning: boolean;
  isImportant: boolean;
}> {
  const entries: Array<{
    rule: CascadedRule;
    value: string;
    isImportant: boolean;
    score: number;
  }> = [];

  for (const cascRule of rules) {
    const value = cascRule.properties.get(property);
    if (value === undefined) continue;
    const isImp = cascRule.isImportant.has(property);
    const isUnlayered = cascRule.layerOrder === -1 || cascRule.isInline;
    entries.push({
      rule: cascRule,
      value,
      isImportant: isImp,
      score: computeCascadeScore(
        isImp,
        isUnlayered,
        cascRule.layerOrder,
        cascRule.specificityScore,
        cascRule.sourceIndex,
      ),
    });
  }

  entries.sort((a, b) => b.score - a.score);

  return entries.map((e, i) => ({
    rule: e.rule,
    value: e.value,
    isWinning: i === 0,
    isImportant: e.isImportant,
  }));
}

/**
 * Compute a single numeric cascade score that respects the CSS Cascade spec:
 *   origin/importance > cascade-layer > specificity > order of appearance
 * Each tier gets its own digit-block so higher tiers strictly dominate.
 */
function computeCascadeScore(
  important: boolean,
  unlayered: boolean,
  layerOrder: number,
  specificityScore: number,
  sourceIndex: number,
): number {
  // Important + unlayered > important + layered > normal + unlayered > ...
  const tier = important ? (unlayered ? 4 : 3) : unlayered ? 2 : 1;
  // Within a tier, layer order matters only for layered rules.
  const layer = unlayered ? 0 : layerOrder;
  // specificityScore can be up to ~1e8; sourceIndex typically < 1e4.
  return (
    tier * 1e12 +
    layer * 1e10 +
    Math.min(specificityScore, 1e9) +
    Math.min(sourceIndex, 1e6)
  );
}

// ---------------------------------------------------------------------------
// CSS Variable dependency tracing
// ---------------------------------------------------------------------------

export function traceVariableDependencies(
  element: HTMLElement,
): VariableNode[] {
  const variables: VariableNode[] = [];
  const computedStyle = window.getComputedStyle(element);
  const seen = new Set<string>();

  const inlineStyle = element.getAttribute("style") || "";
  collectVarsFromText(
    inlineStyle,
    "inline-style",
    computedStyle,
    seen,
    variables,
  );

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const sheetRules = sheet.cssRules ?? sheet.rules;
      if (!sheetRules) continue;
      walkStyleRulesForVars(
        sheetRules,
        element,
        computedStyle,
        seen,
        variables,
      );
    } catch {
      continue;
    }
  }

  return variables.sort((a, b) => a.name.localeCompare(b.name));
}

const VAR_NAME_RE = /var\(\s*(--[^,\s)]+)/g;

function walkStyleRulesForVars(
  ruleList: CSSRuleList,
  element: HTMLElement,
  computedStyle: CSSStyleDeclaration,
  seen: Set<string>,
  variables: VariableNode[],
): void {
  for (const cssRule of Array.from(ruleList)) {
    if (
      cssRule instanceof CSSMediaRule ||
      cssRule instanceof CSSSupportsRule ||
      cssRule instanceof CSSLayerBlockRule
    ) {
      try {
        walkStyleRulesForVars(
          cssRule.cssRules,
          element,
          computedStyle,
          seen,
          variables,
        );
      } catch {
        /* nested cross-origin */
      }
      continue;
    }
    if (!(cssRule instanceof CSSStyleRule)) continue;
    try {
      if (!element.matches(cssRule.selectorText)) continue;
    } catch {
      continue;
    }
    collectVarsFromText(
      cssRule.cssText,
      "stylesheet",
      computedStyle,
      seen,
      variables,
    );
  }
}

function collectVarsFromText(
  text: string,
  source: string,
  computedStyle: CSSStyleDeclaration,
  seen: Set<string>,
  variables: VariableNode[],
): void {
  const re = new RegExp(VAR_NAME_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const varName = match[1];
    if (seen.has(varName)) continue;
    seen.add(varName);

    const value = computedStyle.getPropertyValue(varName).trim();
    const dependencies = extractVarRefs(value);

    variables.push({
      name: varName,
      value,
      resolvedValue: resolveToTerminal(varName, computedStyle, new Set()),
      dependencies,
      source,
    });
  }
}

function extractVarRefs(value: string): string[] {
  const refs: string[] = [];
  const re = new RegExp(VAR_NAME_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(value)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function resolveToTerminal(
  varName: string,
  computedStyle: CSSStyleDeclaration,
  visited: Set<string>,
): string {
  if (visited.has(varName)) return "<circular>";
  visited.add(varName);

  const value = computedStyle.getPropertyValue(varName).trim();
  if (!value) return "<empty>";

  const refs = extractVarRefs(value);
  if (refs.length === 0) return value;

  let resolved = value;
  for (const ref of refs) {
    const terminal = resolveToTerminal(ref, computedStyle, visited);
    // Replace the entire `var(--ref)` expression — including optional
    // whitespace and a fallback clause — with the resolved terminal value.
    resolved = resolved.replace(
      new RegExp(`var\\(\\s*${escapeRegexForVar(ref)}\\s*(?:,[^)]*)?\\)`, "g"),
      terminal,
    );
  }
  return resolved;
}

export function resolveVariableValue(
  varName: string,
  computedStyle: CSSStyleDeclaration,
): string {
  return resolveToTerminal(varName, computedStyle, new Set());
}

function escapeRegexForVar(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Get all properties set on an element with their winning values
// ---------------------------------------------------------------------------

export function getComputedProperties(
  rules: CascadedRule[],
): Map<string, { value: string; rule: CascadedRule; important: boolean }> {
  const result = new Map<
    string,
    { value: string; rule: CascadedRule; important: boolean }
  >();

  const sorted = [...rules].sort((a, b) => {
    const aHasImportant = Array.from(a.isImportant).length;
    const bHasImportant = Array.from(b.isImportant).length;
    if (aHasImportant !== bHasImportant) return bHasImportant - aHasImportant;
    if (a.specificityScore !== b.specificityScore) {
      return b.specificityScore - a.specificityScore;
    }
    return b.sourceIndex - a.sourceIndex;
  });

  for (const cascRule of sorted) {
    for (const [prop, value] of cascRule.properties) {
      if (!result.has(prop) || cascRule.isImportant.has(prop)) {
        result.set(prop, {
          value,
          rule: cascRule,
          important: cascRule.isImportant.has(prop),
        });
      }
    }
  }

  return result;
}
