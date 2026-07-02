import { vi } from "vitest";
import type { ToolDefinition } from "@/tools/types";

export function createMockCtx() {
  const callbacks: (() => void)[] = [];
  return {
    onInvalidated: (cb: () => void) => callbacks.push(cb),
    _callbacks: callbacks,
  };
}

export function testToolMetadata(
  tool: ToolDefinition,
  expected: { id: string; name: string; category: string; icon: string },
) {
  it("should have correct tool metadata", () => {
    expect(tool.id).toBe(expected.id);
    expect(tool.name).toBe(expected.name);
    expect(tool.description).toBeDefined();
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.category).toBe(expected.category);
    expect(tool.icon).toBe(expected.icon);
  });
}

export function testConfigSchema(tool: ToolDefinition) {
  it("should have valid config schema fields", () => {
    const schema = tool.configSchema;
    if (!schema) return;
    for (const [key, field] of Object.entries(schema)) {
      expect(field.type).toBeDefined();
      expect([
        "boolean",
        "string",
        "number",
        "select",
        "color",
        "slider",
      ]).toContain(field.type);
      expect(field.label).toBeDefined();
      expect(field.label.length).toBeGreaterThan(0);
      expect("default" in field).toBe(true);
      if (field.type === "select") {
        expect(field.options).toBeDefined();
        expect(field.options!.length).toBeGreaterThan(0);
      }
      if (field.type === "slider") {
        expect(field.min).toBeDefined();
        expect(field.max).toBeDefined();
      }
    }
  });
}

export function testRunReturnsCleanup(tool: ToolDefinition) {
  it("should return a cleanup function from run()", () => {
    const ctx = createMockCtx();
    const cleanup = tool.run(ctx, {});
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
}

export function testOnInvalidated(tool: ToolDefinition) {
  it("should register onInvalidated callback", () => {
    const ctx = createMockCtx();
    const cleanup = tool.run(ctx, {});
    expect(ctx._callbacks.length).toBeGreaterThan(0);
    cleanup();
  });
}

export function testRunWithConfig(
  tool: ToolDefinition,
  config: Record<string, unknown>,
) {
  it("should accept config options", () => {
    const ctx = createMockCtx();
    const cleanup = tool.run(ctx, config);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
}

export function testCleanupIsCallable(tool: ToolDefinition) {
  it("should not throw when cleanup is called", () => {
    const ctx = createMockCtx();
    const cleanup = tool.run(ctx, {});
    expect(() => cleanup()).not.toThrow();
  });
}

export function runStandardToolTests(
  tool: ToolDefinition,
  expected: { id: string; name: string; category: string; icon: string },
  config?: Record<string, unknown>,
) {
  testToolMetadata(tool, expected);
  testConfigSchema(tool);
  testRunReturnsCleanup(tool);
  testOnInvalidated(tool);
  if (config) {
    testRunWithConfig(tool, config);
  }
  testCleanupIsCallable(tool);
}
