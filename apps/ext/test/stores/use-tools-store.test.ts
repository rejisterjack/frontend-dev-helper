import { describe, it, expect, beforeEach } from "vitest";
import { useToolsStore } from "@/stores/use-tools-store";

describe("useToolsStore", () => {
  beforeEach(() => {
    useToolsStore.setState({ activeTools: {} });
  });

  it("starts with no active tools", () => {
    expect(useToolsStore.getState().activeTools).toEqual({});
  });

  it("activateTool adds an entry with config + timestamp", async () => {
    await useToolsStore
      .getState()
      .activateTool("css-inspector", { mode: "auto" });
    const entry = useToolsStore.getState().activeTools["css-inspector"];
    expect(entry).toBeDefined();
    expect(entry.active).toBe(true);
    expect(entry.config).toEqual({ mode: "auto" });
    expect(entry.activatedAt).toBeGreaterThan(0);
  });

  it("deactivateTool removes the entry", async () => {
    await useToolsStore.getState().activateTool("css-inspector");
    useToolsStore.getState().deactivateTool("css-inspector");
    expect(
      useToolsStore.getState().activeTools["css-inspector"],
    ).toBeUndefined();
  });

  it("toggleTool flips activation state", async () => {
    await useToolsStore.getState().toggleTool("color-picker");
    expect(useToolsStore.getState().activeTools["color-picker"]?.active).toBe(
      true,
    );
    await useToolsStore.getState().toggleTool("color-picker");
    expect(
      useToolsStore.getState().activeTools["color-picker"],
    ).toBeUndefined();
  });

  it("deactivateAll empties the activeTools map", async () => {
    await useToolsStore.getState().activateTool("css-inspector");
    await useToolsStore.getState().activateTool("color-picker");
    useToolsStore.getState().deactivateAll();
    expect(useToolsStore.getState().activeTools).toEqual({});
  });

  it("updateToolConfig merges config without clobbering existing keys", async () => {
    await useToolsStore
      .getState()
      .activateTool("css-inspector", { mode: "auto", color: "red" });
    useToolsStore
      .getState()
      .updateToolConfig("css-inspector", { color: "blue" });
    const config = useToolsStore.getState().activeTools["css-inspector"].config;
    expect(config).toEqual({ mode: "auto", color: "blue" });
  });

  it("updateToolConfig is a no-op for an unknown tool", () => {
    useToolsStore.getState().updateToolConfig("nope", { x: 1 });
    expect(useToolsStore.getState().activeTools).toEqual({});
  });

  it("setToolError attaches an error message to the entry", async () => {
    await useToolsStore.getState().activateTool("css-inspector");
    useToolsStore.getState().setToolError("css-inspector", "boom");
    expect(useToolsStore.getState().activeTools["css-inspector"].error).toBe(
      "boom",
    );
  });
});