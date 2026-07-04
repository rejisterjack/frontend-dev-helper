import { describe, it, expect } from "vitest";
import {
  computeSpecificity,
  specificityScore,
  specificityToString,
  detectConflicts,
  getPropertyCascade,
  resolveVariableValue,
  getComputedProperties,
  type CascadedRule,
} from "@/lib/css-analysis";

function rule(
  overrides: Partial<CascadedRule> & { selector: string },
): CascadedRule {
  return {
    rule: null as any,
    specificity: overrides.specificity ?? { a: 0, b: 0, c: 0 },
    specificityScore:
      overrides.specificityScore ??
      specificityScore(overrides.specificity ?? { a: 0, b: 0, c: 0 }),
    properties: overrides.properties ?? new Map(),
    isInline: overrides.isInline ?? false,
    isImportant: overrides.isImportant ?? new Set(),
    sourceIndex: overrides.sourceIndex ?? 0,
    layerOrder: overrides.layerOrder ?? -1,
    layerName: overrides.layerName ?? null,
    selector: overrides.selector,
  };
}

describe("computeSpecificity", () => {
  it("returns 0,0,0 for universal and :where()", () => {
    expect(computeSpecificity("*")).toEqual({ a: 0, b: 0, c: 0 });
    expect(computeSpecificity(":where(.foo, #bar)")).toEqual({
      a: 0,
      b: 0,
      c: 0,
    });
  });

  it("counts id, class, attribute, type", () => {
    expect(computeSpecificity("#id")).toEqual({ a: 1, b: 0, c: 0 });
    expect(computeSpecificity(".cls")).toEqual({ a: 0, b: 1, c: 0 });
    expect(computeSpecificity("[type=text]")).toEqual({ a: 0, b: 1, c: 0 });
    expect(computeSpecificity("div")).toEqual({ a: 0, b: 0, c: 1 });
  });

  it("uses most-specific argument for :is()/:not()", () => {
    expect(computeSpecificity(":is(#a, .b)")).toEqual({ a: 1, b: 0, c: 0 });
    expect(computeSpecificity(":not(.a.b)")).toEqual({ a: 0, b: 2, c: 0 });
  });

  it("counts pseudo-element as type selector", () => {
    expect(computeSpecificity("::before")).toEqual({ a: 0, b: 0, c: 1 });
    expect(computeSpecificity("a::after")).toEqual({ a: 0, b: 0, c: 2 });
  });

  it("counts pseudo-class as class selector", () => {
    expect(computeSpecificity("a:hover")).toEqual({ a: 0, b: 1, c: 1 });
  });

  it("handles compound selectors", () => {
    const s = computeSpecificity("#nav .item a:hover");
    // 1 id, 1 class + 1 pseudo-class = 2 in b, 1 type
    expect(s).toEqual({ a: 1, b: 2, c: 1 });
  });
});

describe("specificityScore / specificityToString", () => {
  it("computes a comparable score", () => {
    expect(specificityScore({ a: 1, b: 0, c: 0 })).toBeGreaterThan(
      specificityScore({ a: 0, b: 99, c: 99 }),
    );
  });

  it("renders as comma-separated tuple", () => {
    expect(specificityToString({ a: 1, b: 2, c: 3 })).toBe("1,2,3");
  });
});

describe("detectConflicts", () => {
  it("returns no conflicts when only one rule sets each prop", () => {
    const r1 = rule({
      selector: ".a",
      specificity: { a: 0, b: 1, c: 0 },
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 0,
    });
    expect(detectConflicts([r1])).toEqual([]);
  });

  it("ignores conflicts where values match", () => {
    const r1 = rule({
      selector: ".a",
      specificity: { a: 0, b: 1, c: 0 },
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 0,
    });
    const r2 = rule({
      selector: ".b",
      specificity: { a: 0, b: 1, c: 0 },
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 1,
    });
    expect(detectConflicts([r1, r2])).toEqual([]);
  });

  it("picks the higher specificity as winner", () => {
    const r1 = rule({
      selector: ".a",
      specificity: { a: 0, b: 1, c: 0 },
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 0,
    });
    const r2 = rule({
      selector: "#a",
      specificity: { a: 1, b: 0, c: 0 },
      specificityScore: 10000,
      properties: new Map([["color", "blue"]]),
      sourceIndex: 1,
    });
    const conflicts = detectConflicts([r1, r2]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].property).toBe("color");
    expect(conflicts[0].winner.selector).toBe("#a");
    expect(conflicts[0].winningValue).toBe("blue");
  });

  it("!important beats higher specificity", () => {
    const r1 = rule({
      selector: "#a",
      specificity: { a: 1, b: 0, c: 0 },
      specificityScore: 10000,
      properties: new Map([["color", "blue"]]),
      sourceIndex: 0,
    });
    const r2 = rule({
      selector: ".a",
      specificity: { a: 0, b: 1, c: 0 },
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      isImportant: new Set(["color"]),
      sourceIndex: 1,
    });
    const conflicts = detectConflicts([r1, r2]);
    expect(conflicts[0].winner.selector).toBe(".a");
  });

  it("unlayered beats layered at same importance", () => {
    const r1 = rule({
      selector: ".a",
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 0,
      layerOrder: 1,
    });
    const r2 = rule({
      selector: ".b",
      specificityScore: 100,
      properties: new Map([["color", "blue"]]),
      sourceIndex: 1,
      layerOrder: -1,
    });
    const conflicts = detectConflicts([r1, r2]);
    expect(conflicts[0].winner.selector).toBe(".b");
  });
});

describe("getPropertyCascade", () => {
  it("marks the highest-scored entry as winning", () => {
    const r1 = rule({
      selector: ".a",
      specificityScore: 100,
      properties: new Map([["color", "red"]]),
      sourceIndex: 0,
    });
    const r2 = rule({
      selector: "#a",
      specificityScore: 10000,
      properties: new Map([["color", "blue"]]),
      sourceIndex: 1,
    });
    const cascade = getPropertyCascade([r1, r2], "color");
    expect(cascade[0].isWinning).toBe(true);
    expect(cascade[0].value).toBe("blue");
    expect(cascade[1].isWinning).toBe(false);
  });
});

describe("getComputedProperties", () => {
  it("returns the winning value per property", () => {
    const r1 = rule({
      selector: ".a",
      specificityScore: 100,
      properties: new Map([
        ["color", "red"],
        ["font-size", "16px"],
      ]),
      sourceIndex: 0,
    });
    const r2 = rule({
      selector: "#a",
      specificityScore: 10000,
      properties: new Map([["color", "blue"]]),
      sourceIndex: 1,
    });
    const result = getComputedProperties([r1, r2]);
    expect(result.get("color")?.value).toBe("blue");
    expect(result.get("font-size")?.value).toBe("16px");
  });
});

describe("resolveVariableValue", () => {
  function makeStyle(vars: Record<string, string>): CSSStyleDeclaration {
    const store = vars as Record<string, any>;
    return {
      getPropertyValue: (name: string) => store[name] ?? "",
    } as any;
  }

  it("resolves a terminal variable", () => {
    const style = makeStyle({ "--color": "#fff" });
    expect(resolveVariableValue("--color", style)).toBe("#fff");
  });

  it("resolves a chain of var references", () => {
    const style = makeStyle({
      "--base": "#000",
      "--text": "var(--base)",
    });
    expect(resolveVariableValue("--text", style)).toBe("#000");
  });

  it("returns <empty> when undefined", () => {
    const style = makeStyle({});
    expect(resolveVariableValue("--missing", style)).toBe("<empty>");
  });

  it("detects circular references", () => {
    const style = makeStyle({
      "--a": "var(--b)",
      "--b": "var(--a)",
    });
    expect(resolveVariableValue("--a", style)).toBe("<circular>");
  });
});
