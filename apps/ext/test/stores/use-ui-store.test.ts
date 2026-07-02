import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/use-ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      currentView: "dashboard",
      selectedCategory: null,
      selectedToolId: null,
      searchQuery: "",
      commandPaletteOpen: false,
      history: [],
      favoriteToolIds: [],
      recentToolIds: [],
    });
  });

  it("navigateTo pushes the current view onto history and switches", () => {
    useUIStore.getState().navigateTo("settings");
    const s = useUIStore.getState();
    expect(s.currentView).toBe("settings");
    expect(s.history).toHaveLength(1);
    expect(s.history[0].view).toBe("dashboard");
  });

  it("navigateTo with meta carries category/toolId forward", () => {
    useUIStore.getState().navigateTo("category", { category: "css" });
    useUIStore
      .getState()
      .navigateTo("tool-detail", { toolId: "css-inspector" });
    const s = useUIStore.getState();
    expect(s.selectedCategory).toBe("css");
    expect(s.selectedToolId).toBe("css-inspector");
  });

  it("goBack pops history and restores prior view", () => {
    useUIStore.getState().navigateTo("settings");
    useUIStore.getState().navigateTo("ai-chat");
    useUIStore.getState().goBack();
    const s = useUIStore.getState();
    expect(s.currentView).toBe("settings");
    expect(s.history).toHaveLength(1);
  });

  it("goBack is a no-op when history is empty", () => {
    useUIStore.getState().goBack();
    expect(useUIStore.getState().currentView).toBe("dashboard");
  });

  it("setSearchQuery + toggleCommandPalette", () => {
    useUIStore.getState().setSearchQuery("css");
    expect(useUIStore.getState().searchQuery).toBe("css");
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    useUIStore.getState().toggleCommandPalette();
    expect(useUIStore.getState().commandPaletteOpen).toBe(false);
  });

  it("addFavorite dedupes", () => {
    useUIStore.getState().addFavorite("css-inspector");
    useUIStore.getState().addFavorite("css-inspector");
    expect(useUIStore.getState().favoriteToolIds).toEqual(["css-inspector"]);
  });

  it("removeFavorite drops the id", () => {
    useUIStore.getState().addFavorite("css-inspector");
    useUIStore.getState().removeFavorite("css-inspector");
    expect(useUIStore.getState().favoriteToolIds).toEqual([]);
  });

  it("toggleFavorite adds then removes", () => {
    useUIStore.getState().toggleFavorite("a");
    useUIStore.getState().toggleFavorite("b");
    expect(useUIStore.getState().favoriteToolIds).toEqual(["a", "b"]);
    useUIStore.getState().toggleFavorite("a");
    expect(useUIStore.getState().favoriteToolIds).toEqual(["b"]);
  });

  it("addRecent dedupes + caps at 10", () => {
    for (let i = 0; i < 15; i++) useUIStore.getState().addRecent(`tool-${i}`);
    const recents = useUIStore.getState().recentToolIds;
    expect(recents).toHaveLength(10);
    // Most-recent-first ordering.
    expect(recents[0]).toBe("tool-14");
  });
});
