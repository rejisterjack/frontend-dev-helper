import { describe, beforeEach, vi, it, expect } from "vitest";
import { networkReplay } from "@/tools/performance/network-replay";
import { runStandardToolTests } from "../../helpers";

describe("networkReplay", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(networkReplay, {
    id: "network-replay",
    name: "Network Replay",
    category: "performance",
    icon: "Repeat",
  });

  it("exposes captureXHR / captureFetch / maxBodySize configs", () => {
    const schema = networkReplay.configSchema;
    expect(schema.captureXHR).toBeDefined();
    expect(schema.captureFetch).toBeDefined();
    expect(schema.maxBodySize).toBeDefined();
    expect(schema.maxBodySize.type).toBe("slider");
  });
});
