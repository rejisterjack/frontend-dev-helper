import { describe, it, expect } from "vitest";
import {
  formatValue,
  getTypeColor,
} from "@/tools/inspection/react-state-panel";

describe("formatValue", () => {
  it("handles primitives", () => {
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue(null)).toBe("null");
    expect(formatValue(true)).toBe("true");
    expect(formatValue(42)).toBe("42");
    expect(formatValue("hello")).toBe("hello");
  });

  it("renders functions as [Function]", () => {
    expect(formatValue(() => {})).toBe("[Function]");
  });

  it("renders symbols via toString()", () => {
    expect(formatValue(Symbol("foo"))).toBe("Symbol(foo)");
  });

  it("stringifies plain objects", () => {
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });

  it("truncates long values with an ellipsis at maxLength", () => {
    const long = "x".repeat(100);
    expect(formatValue(long, 10)).toBe("xxxxxxxxxx...");
  });

  it("uses a default maxLength of 60", () => {
    const long = "y".repeat(80);
    const out = formatValue(long);
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBe(63); // 60 + "..."
  });

  it("falls back to String(value) for circular objects", () => {
    const circular: any = {};
    circular.self = circular;
    const out = formatValue(circular);
    // JSON.stringify throws -> catch returns String(obj)
    expect(out.startsWith("[object Object]")).toBe(true);
  });
});

describe("getTypeColor", () => {
  it("null/undefined are slate", () => {
    expect(getTypeColor(null)).toBe("#64748b");
    expect(getTypeColor(undefined)).toBe("#64748b");
  });

  it("string is light blue", () => {
    expect(getTypeColor("x")).toBe("#a5d6ff");
  });

  it("number is blue", () => {
    expect(getTypeColor(1)).toBe("#79c0ff");
  });

  it("boolean is red", () => {
    expect(getTypeColor(true)).toBe("#ff7b72");
  });

  it("function is purple", () => {
    expect(getTypeColor(() => {})).toBe("#d2a8ff");
  });

  it("object is green", () => {
    expect(getTypeColor({})).toBe("#7ee787");
  });
});
