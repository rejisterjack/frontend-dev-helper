import { useEffect, useState } from "react";
import { DashboardView } from "@/components/panels/dashboard-view";
import { CategoryView } from "@/components/panels/category-view";
import { ToolDetailPanel } from "@/components/panels/tool-detail-panel";
import { SettingsPanel } from "@/components/panels/settings-panel";
import { AIChatPanel } from "@/components/panels/ai-chat-panel";
import { ReactProfilerPanel } from "@/components/panels/react-profiler-panel";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { DevToolsShell } from "@/components/layout/devtools-shell";
import { useUIStore } from "@/stores/use-ui-store";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useMessageListener } from "@/hooks/use-message-listener";
import { useCommandPalette } from "@/hooks/use-command-palette";
import type { FDHMessage } from "@/lib/messaging/types";
import { useConnectionStore } from "@/stores/use-connection-store";

function ViewRouter({ profilerTabId }: { profilerTabId: number | null }) {
  const currentView = useUIStore((s) => s.currentView);

  switch (currentView) {
    case "dashboard":
      return <DashboardView />;
    case "category":
      return <CategoryView />;
    case "tool-detail":
      return <ToolDetailPanel />;
    case "settings":
      return <SettingsPanel />;
    case "ai-chat":
      return <AIChatPanel />;
    case "react-profiler":
      return <ReactProfilerPanel tabId={profilerTabId} />;
    default:
      return <DashboardView />;
  }
}

function DevToolsApp() {
  const theme = useSettingsStore((s) => s.theme);
  const setContentScriptReady = useConnectionStore(
    (s) => s.setContentScriptReady,
  );
  const [profilerTabId, setProfilerTabId] = useState<number | null>(null);

  useEffect(() => {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  useEffect(() => {
    const tabId = browser.devtools.inspectedWindow.tabId;
    if (tabId) {
      setProfilerTabId(tabId);
      setContentScriptReady(true);
      browser.tabs.sendMessage(tabId, { type: "BG_PING" }).catch(() => {
        setContentScriptReady(false);
      });
    }
  }, [setContentScriptReady]);

  useCommandPalette();

  useMessageListener((message: FDHMessage) => {
    if (message.type === "BG_TOOL_STATE_CHANGED") {
      // Tool state changes are handled via storage persistence
    }
  });

  return (
    <DevToolsShell>
      <ViewRouter profilerTabId={profilerTabId} />
      <CommandPalette />
      <OnboardingOverlay />
    </DevToolsShell>
  );
}

export default DevToolsApp;
