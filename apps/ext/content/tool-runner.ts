import { toolMetadata } from "@/tools/metadata";
import { loadTool } from "@/tools/lazy-registry";

interface ActiveTool {
  cleanup: () => void;
}

export class ToolRunner {
  private activeMap = new Map<string, ActiveTool>();
  private ctx: { onInvalidated: (cb: () => void) => void };

  constructor(ctx: { onInvalidated: (cb: () => void) => void }) {
    this.ctx = ctx;
  }

  async activate(
    toolId: string,
    config?: Record<string, unknown>,
  ): Promise<void> {
    if (this.activeMap.has(toolId)) {
      this.deactivate(toolId);
    }

    const meta = toolMetadata[toolId];
    if (!meta) {
      console.warn(`[FDH] Unknown tool: ${toolId}`);
      return;
    }

    try {
      const definition = await loadTool(toolId);
      if (!definition) {
        console.warn(`[FDH] Failed to load tool: ${toolId}`);
        return;
      }

      const cleanup = definition.run(this.ctx, config);
      this.activeMap.set(toolId, { cleanup });
      console.log(`[FDH] Tool activated: ${toolId}`);

      // Dispatch a CustomEvent so in-page observers (e.g. session-replay)
      // can record tool activations without coupling to the runner. The
      // session-replay tool listens for 'fdh-tool-activated' / 'fdh-tool-
      // deactivated'; without these events being dispatched, recording
      // captured zero tool activity.
      document.dispatchEvent(
        new CustomEvent("fdh-tool-activated", {
          detail: { toolId, toolName: meta.name },
        }),
      );

      browser.runtime
        .sendMessage({
          type: "CONTENT_TOOL_RESULT",
          toolId,
          data: { activated: true },
        })
        .catch(() => {});
    } catch (error) {
      console.error(`[FDH] Tool activation error: ${toolId}`, error);
      browser.runtime
        .sendMessage({
          type: "CONTENT_TOOL_ERROR",
          toolId,
          error: error instanceof Error ? error.message : String(error),
        })
        .catch(() => {});
    }
  }

  deactivate(toolId: string): void {
    const active = this.activeMap.get(toolId);
    if (active) {
      try {
        active.cleanup();
      } catch (error) {
        console.error(`[FDH] Tool cleanup error: ${toolId}`, error);
      }
      this.activeMap.delete(toolId);
      console.log(`[FDH] Tool deactivated: ${toolId}`);
      const meta = toolMetadata[toolId];
      document.dispatchEvent(
        new CustomEvent("fdh-tool-deactivated", {
          detail: { toolId, toolName: meta?.name ?? toolId },
        }),
      );
    }
  }

  deactivateAll(): void {
    for (const toolId of this.activeMap.keys()) {
      this.deactivate(toolId);
    }
  }

  isActive(toolId: string): boolean {
    return this.activeMap.has(toolId);
  }

  getActiveToolIds(): string[] {
    return Array.from(this.activeMap.keys());
  }
}
