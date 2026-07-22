import { describe, beforeEach, vi, it, expect } from "vitest";
import { flameGraph } from "@/tools/performance/flame-graph";
import { runStandardToolTests } from "../../helpers";

describe("flameGraph", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(
    flameGraph,
    {
      id: "flame-graph",
      name: "Performance Entries Viewer",
      category: "performance",
      icon: "Flame",
    },
    {
      sampleRate: 10,
      maxDuration: 30,
      showLongTasks: true,
      showIdle: false,
    },
  );

  it("should be categorized as performance", () => {
    expect(flameGraph.category).toBe("performance");
  });
});
