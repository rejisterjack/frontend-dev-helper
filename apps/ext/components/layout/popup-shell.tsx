import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sun, Moon, Keyboard } from "lucide-react";
import { useSettingsStore } from "@/stores/use-settings-store";
import { useUIStore } from "@/stores/use-ui-store";
import { useConnectionStore } from "@/stores/use-connection-store";

type TabValue = "dashboard" | "ai-chat" | "settings";

const TABS: { value: TabValue; label: string }[] = [
  { value: "dashboard", label: "Tools" },
  { value: "ai-chat", label: "Chat" },
  { value: "settings", label: "Settings" },
];

function mapViewToTab(view: string): TabValue {
  if (view === "ai-chat") return "ai-chat";
  if (view === "settings") return "settings";
  return "dashboard";
}

export function PopupShell({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const currentView = useUIStore((s) => s.currentView);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const contentScriptReady = useConnectionStore((s) => s.contentScriptReady);

  const activeTab = mapViewToTab(currentView);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
            <span className="text-[0.55rem] font-bold leading-none">F</span>
          </div>
          <span className="text-xs font-semibold tracking-tight">FDH</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`inline-block size-1.5 rounded-full ${contentScriptReady ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {contentScriptReady ? "Content script active" : "No active page"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="size-3" />
                ) : (
                  <Moon className="size-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Toggle theme
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center justify-between px-4 shrink-0">
        <Tabs
          value={activeTab}
          onValueChange={(v) => navigateTo(v as TabValue)}
        >
          <TabsList className="bg-transparent h-auto p-0 gap-4">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="
                  relative rounded-none bg-transparent px-0 pb-2 pt-0
                  text-xs font-medium shadow-none
                  data-[state=active]:text-foreground
                  data-[state=inactive]:text-muted-foreground
                  data-[state=inactive]:hover:text-foreground/70
                  after:absolute after:bottom-0 after:left-0 after:right-0
                  after:h-0.5 after:rounded-full after:bg-primary
                  after:content-[''] after:scale-x-0
                  data-[state=active]:after:scale-x-100
                  after:transition-transform
                "
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={toggleCommandPalette}
            >
              <Keyboard className="size-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Command Palette
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      {/* Content — each panel manages its own scrolling */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
