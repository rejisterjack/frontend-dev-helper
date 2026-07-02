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
const CLASS_ATTR_RE = /\.[a-zA-Z0-9_-]+|\[[^\]]+\]|:[a-zA-Z-]+(?:\([^)]*\))?/g;
const TYPE_RE = /^[a-zA-Z][a-zA-Z0-9]*/;
const PSEUDO_ELEMENT_RE = /::[a-zA-Z-]+/g;

export function computeSpecificity(selector: string): Specificity {
  const spec: Specificity = { a: 0, b: 0, c: 0 };

  // Remove pseudo-elements before computing (they count as type selectors)
  const cleaned = selector.replace(PSEUDO_ELEMENT_RE, (m) => {
    spec.c++;
    return "";
  });

  // Count ID selectors
  const idMatches = cleaned.match(ID_RE);
  if (idMatches) spec.a += idMatches.length;

  // Count class, attribute, and pseudo-class selectors
  const classMatches = cleaned.match(CLASS_ATTR_RE);
  if (classMatches) {
    for (const m of classMatches) {
      if (!m.startsWith("::")) spec.b++;
    }
  }

  // Count type selectors (but not in pseudo-class arguments)
  const parts = cleaned.split(/[:\[\].#]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && TYPE_RE.test(trimmed) && !trimmed.startsWith("-")) {
      spec.c++;
    }
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
): void {
  for (let ri = 0; ri < ruleList.length; ri++) {
    const cssRule = ruleList[ri];
    if (
      cssRule instanceof CSSMediaRule ||
      cssRule instanceof CSSSupportsRule ||
      cssRule instanceof CSSLayerBlockRule
    ) {
      try {
        collectMatchingRulesFromList(
          cssRule.cssRules,
          element,
          sourceIndex,
          rules,
          seenSelectors,
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

    const key = `${cssRule.selectorText}@${sourceIndex}`;
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
      if (a.important !== b.important) return b.important ? 1 : -1;
      if (a.rule.isInline !== b.rule.isInline) return b.rule.isInline ? 1 : -1;
      if (a.rule.specificityScore !== b.rule.specificityScore) {
        return b.rule.specificityScore - a.rule.specificityScore;
      }
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
    entries.push({
      rule: cascRule,
      value,
      isImportant: cascRule.isImportant.has(property),
      score: cascRule.isImportant.has(property)
        ? 1_000_000 + cascRule.specificityScore
        : cascRule.specificityScore,
    });
  }

  entries.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.rule.sourceIndex - a.rule.sourceIndex;
  });

  return entries.map((e, i) => ({
    rule: e.rule,
    value: e.value,
    isWinning: i === 0,
    isImportant: e.isImportant,
  }));
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
    resolved = resolved.replace(
      new RegExp(escapeRegexForVar(ref), "g"),
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
