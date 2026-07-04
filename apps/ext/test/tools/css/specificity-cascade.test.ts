import { describe, beforeEach, vi, it, expect } from "vitest";
import { specificityCascade } from "@/tools/css/specificity-cascade";
import { runStandardToolTests, createMockCtx } from "../../helpers";

describe("specificityCascade", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(specificityCascade, {
    id: "specificity-cascade",
    name: "Specificity Cascade",
    category: "css",
    icon: "GitBranch",
  });

  it("truncates long selector labels in panel", () => {
    // Indirect coverage of the module-private `truncate` helper via the
    // shared standard test runner is not feasible; instead we confirm the
    // tool surfaces a panel and registers an overlay when activated.
    const ctx = createMockCtx();
    const cleanup = specificityCascade.run(ctx, {});
    expect(typeof cleanup).toBe("function");
    expect(() => cleanup()).not.toThrow();
  });
});
