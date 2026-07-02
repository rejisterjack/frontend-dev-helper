import { describe, beforeEach, vi, it, expect } from "vitest";
import { networkAnalyzer } from "@/tools/performance/network-analyzer";
import { NetworkCapture } from "@/lib/network-capture";
import { runStandardToolTests } from "../../helpers";

describe("networkAnalyzer", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(
    networkAnalyzer,
    {
      id: "network-analyzer",
      name: "Network Analyzer",
      category: "performance",
      icon: "Wifi",
    },
    {
      captureXHR: true,
      captureFetch: true,
      captureImages: true,
      captureScripts: true,
      maxEntries: 100,
      showTiming: true,
    },
  );

  it("should have network-specific config", () => {
    const schema = networkAnalyzer.configSchema;
    expect(schema.captureXHR).toBeDefined();
    expect(schema.captureFetch).toBeDefined();
    expect(schema.maxEntries).toBeDefined();
  });

  it("NetworkCapture.stop() restores fetch after start()", async () => {
    const probe = vi.fn().mockResolvedValue(new Response("ok"));
    window.fetch = probe as typeof window.fetch;

    const capture = new NetworkCapture({
      captureFetch: true,
      captureXHR: false,
    });
    capture.start();
    expect(window.fetch).not.toBe(probe);

    await window.fetch("https://example.com/probe");
    expect(probe).toHaveBeenCalled();

    capture.stop();
    expect(window.fetch).toBe(probe);
    expect(capture.isRunning()).toBe(false);
  });
});
