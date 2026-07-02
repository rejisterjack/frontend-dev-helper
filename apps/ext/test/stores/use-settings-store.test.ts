import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "@/stores/use-settings-store";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetToDefaults();
  });

  it("starts with the documented defaults", () => {
    const s = useSettingsStore.getState();
    expect(s.theme).toBe("system");
    expect(s.defaultCategoryView).toBe("grid");
    expect(s.showInactiveTools).toBe(false);
    expect(s.enableTelemetry).toBe(false);
    expect(s.ai.provider).toBe("openrouter");
    expect(s.ai.model).toBe("openai/gpt-4o-mini");
    expect(s.vscode.port).toBe(9456);
    expect(s.vscode.bridgeToken).toBe("");
  });

  it("setTheme updates theme", () => {
    useSettingsStore.getState().setTheme("dark");
    expect(useSettingsStore.getState().theme).toBe("dark");
  });

  it("updateSetting updates a generic field", () => {
    useSettingsStore.getState().updateSetting("showInactiveTools", true);
    expect(useSettingsStore.getState().showInactiveTools).toBe(true);
  });

  it("updateAIConfig merges partials without dropping existing fields", () => {
    useSettingsStore.getState().updateAIConfig({ apiKey: "sk-test" });
    useSettingsStore
      .getState()
      .updateAIConfig({ model: "anthropic/claude-3.5-sonnet" });
    const { ai } = useSettingsStore.getState();
    expect(ai.apiKey).toBe("sk-test");
    expect(ai.model).toBe("anthropic/claude-3.5-sonnet");
    // Untouched fields preserved.
    expect(ai.provider).toBe("openrouter");
    expect(ai.baseUrl).toBe("https://openrouter.ai/api/v1");
  });

  it("updateGitHubConfig and updateVSCodeConfig merge partials", () => {
    useSettingsStore.getState().updateGitHubConfig({ token: "ghp_x" });
    useSettingsStore
      .getState()
      .updateVSCodeConfig({ port: 12345, bridgeToken: "tok" });
    const s = useSettingsStore.getState();
    expect(s.github.token).toBe("ghp_x");
    expect(s.vscode.port).toBe(12345);
    expect(s.vscode.bridgeToken).toBe("tok");
  });

  it("resetToDefaults restores the initial shape", () => {
    useSettingsStore.getState().setTheme("dark");
    useSettingsStore.getState().updateAIConfig({ apiKey: "x" });
    useSettingsStore.getState().resetToDefaults();
    const s = useSettingsStore.getState();
    expect(s.theme).toBe("system");
    expect(s.ai.apiKey).toBe("");
  });
});
