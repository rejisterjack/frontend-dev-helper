import { describe, it, expect } from "vitest";
import { formatValue } from "@/tools/inspection/vue-state-panel";

// Vue state-panel mirrors the React panel's formatting helpers. We only
// smoke-test it here to ensure parity is preserved.
describe("vue-state-panel: formatValue", () => {
  it("handles primitives", () => {
    expect(formatValue(null)).toBe("null");
    expect(formatValue("ok")).toBe("ok");
    expect(formatValue(() => {})).toBe("[Function]");
  });

  it("stringifies objects", () => {
    expect(formatValue({ x: 1 })).toBe('{"x":1}');
  });

  it("truncates long strings", () => {
    expect(formatValue("abcdefghij", 4)).toBe("abcd...");
  });
});
