import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

import {
  Sun,
  Moon,
  Settings,
  Terminal,
  Sparkles,
  LayoutDashboard,
  Wifi,
  WifiOff,
  Eye,
  Palette,
  Zap,
  Accessibility,
  Bot,
  Wrench,
  Activity,
} from "lucide-react";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useUIStore } from "@/stores/use-ui-store";
import { useConnectionStore } from "@/stores/use-connection-store";
import { useToolsStore } from "@/stores/use-tools-store";
import { toolMetadata } from "@/tools/metadata";

const categoryIcons: Record<string, ReactNode> = {
  inspection: <Eye className="size-3.5" />,
  css: <Palette className="size-3.5" />,
  performance: <Zap className="size-3.5" />,
  accessibility: <Accessibility className="size-3.5" />,
  ai: <Bot className="size-3.5" />,
  utility: <Wrench className="size-3.5" />,
};

const categoryLabels: Record<string, string> = {
  inspection: "Inspection",
  css: "CSS",
  performance: "Performance",
  accessibility: "Accessibility",
  ai: "AI",
  utility: "Utilities",
};

function getActiveCountByCategory(): Record<string, number> {
  const activeTools = useToolsStore.getState().activeTools;
  const counts: Record<string, number> = {};
  for (const [toolId, state] of Object.entries(activeTools)) {
    if (state.active && toolMetadata[toolId]) {
      const cat = toolMetadata[toolId].category;
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return counts;
}

export function DevToolsShell({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const currentView = useUIStore((s) => s.currentView);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const contentScriptReady = useConnectionStore((s) => s.contentScriptReady);
  const activeTools = useToolsStore((s) => s.activeTools);
  const activeCount = Object.values(activeTools).filter((t) => t.active).length;

  const activeByCategory = getActiveCountByCategory();

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const categories = Object.values(toolMetadata).reduce((acc, tool) => {
    if (!acc.includes(tool.category)) acc.push(tool.category);
    return acc;
  }, [] as string[]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="w-12 flex flex-col items-center py-2 gap-1 border-r shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "dashboard" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => navigateTo("dashboard")}
            >
              <LayoutDashboard className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Dashboard
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        {categories.map((cat) => (
          <Tooltip key={cat}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 relative"
                onClick={() => navigateTo("category", { category: cat })}
              >
                {categoryIcons[cat]}
                {activeByCategory[cat] ? (
                  <Badge className="absolute -top-0.5 -right-0.5 size-3.5 p-0 text-[0.5rem] flex items-center justify-center">
                    {activeByCategory[cat]}
                  </Badge>
                ) : null}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {categoryLabels[cat]}
            </TooltipContent>
          </Tooltip>
        ))}

        <Separator className="my-1 w-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "react-profiler" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => navigateTo("react-profiler")}
            >
              <Activity className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            React Profiler
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleCommandPalette}
            >
              <Terminal className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Command Palette (Ctrl+K)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "ai-chat" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => navigateTo("ai-chat")}
            >
              <Sparkles className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            AI Assistant
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === "settings" ? "secondary" : "ghost"}
              size="icon"
              className="size-8"
              onClick={() => navigateTo("settings")}
            >
              <Settings className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Settings
          </TooltipContent>
        </Tooltip>

        <Separator className="my-1 w-6" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="size-3.5" />
              ) : (
                <Moon className="size-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Toggle theme
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight">FDH</span>
            <Badge
              variant={contentScriptReady ? "default" : "secondary"}
              className="gap-1 text-[0.6rem] px-1.5 py-0 cursor-default"
            >
              {contentScriptReady ? (
                <Wifi className="size-2.5" />
              ) : (
                <WifiOff className="size-2.5" />
              )}
              {contentScriptReady ? "Connected" : "No page"}
            </Badge>
          </div>
          {activeCount > 0 && (
            <Badge variant="default" className="text-[0.6rem] px-1.5 py-0">
              {activeCount} active
            </Badge>
          )}
          <span className="text-[0.6rem] text-muted-foreground">v1.0.0</span>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3">{children}</div>
        </ScrollArea>
      </div>
    </div>
  );
}
