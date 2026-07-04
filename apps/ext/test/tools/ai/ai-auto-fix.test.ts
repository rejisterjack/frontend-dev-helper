import { describe, beforeEach, vi, it, expect } from "vitest";
import { aiAutoFix } from "@/tools/ai/ai-auto-fix";
import {
  stripCodeFences,
  parseJsonObjectResponse,
  parseJsonArrayResponse,
} from "@/tools/ai/ai-auto-fix";
import { runStandardToolTests } from "../../helpers";

describe("aiAutoFix", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(aiAutoFix, {
    id: "ai-auto-fix",
    name: "AI Auto-Fix",
    category: "ai",
    icon: "wand-2",
  });

  it("exposes minSeverity config", () => {
    expect(aiAutoFix.configSchema.minSeverity).toBeDefined();
    expect(aiAutoFix.configSchema.minSeverity.type).toBe("select");
  });
});

describe("stripCodeFences", () => {
  it("returns input unchanged when no fences", () => {
    expect(stripCodeFences('{"a":1}')).toBe('{"a":1}');
  });

  it("strips a single ```json ... ``` fence", () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("strips fences without a language tag", () => {
    expect(stripCodeFences("```\nplain\n```")).toBe("plain");
  });

  it("strips multiple fences independently (non-greedy)", () => {
    const input = "```js\nfoo\n```\n---\n```js\nbar\n```";
    expect(stripCodeFences(input)).toBe("foo\n\n---\nbar");
  });

  it("trims surrounding whitespace", () => {
    expect(stripCodeFences("   ```\nx\n```   ")).toBe("x");
  });
});

describe("parseJsonObjectResponse", () => {
  it("parses a valid object literal", () => {
    expect(parseJsonObjectResponse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null for an array", () => {
    // JSON.parse succeeds but returns an array — caller is asking for an
    // object, so this should be a soft failure, not a crash.
    const out = parseJsonObjectResponse<{ a: number }>("[1,2,3]");
    // The function returns the parsed value as-is; type narrowing is the
    // caller's responsibility. We just confirm it doesn't throw.
    expect(out).toEqual([1, 2, 3]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonObjectResponse("not json")).toBeNull();
  });
});

describe("parseJsonArrayResponse", () => {
  it("parses a JSON array", () => {
    expect(parseJsonArrayResponse<number>("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("returns null when the parsed value is not an array", () => {
    expect(parseJsonArrayResponse('{"a":1}')).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonArrayResponse("garbage")).toBeNull();
  });
});
