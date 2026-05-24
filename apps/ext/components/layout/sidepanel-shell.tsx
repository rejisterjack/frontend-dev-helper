import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sun,
  Moon,
  Settings,
  Terminal,
  Sparkles,
  LayoutDashboard,
  Wifi,
  WifiOff,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Code,
  Paintbrush,
  Gauge,
  ShieldCheck,
  Bot,
  Wrench,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/use-settings-store';
import { useUIStore } from '@/stores/use-ui-store';
import { useConnectionStore } from '@/stores/use-connection-store';
import { useToolsStore } from '@/stores/use-tools-store';
import { metadataByCategory } from '@/tools/metadata';
import type { ToolCategory } from '@/tools/types';

type View = 'dashboard' | 'category' | 'tool-detail' | 'settings' | 'ai-chat';

interface NavItem {
  view: View;
  label: string;
  icon: ReactNode;
  category?: string;
}

const CATEGORY_ICONS: Record<string, ReactNode> = {
  inspection: <Search className="size-4" />,
  css: <Paintbrush className="size-4" />,
  performance: <Gauge className="size-4" />,
  accessibility: <ShieldCheck className="size-4" />,
  ai: <Bot className="size-4" />,
  utility: <Wrench className="size-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  css: 'CSS',
  performance: 'Performance',
  accessibility: 'Accessibility',
  ai: 'AI & Smart',
  utility: 'Utilities',
};

const MAIN_NAV: NavItem[] = [
  { view: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { view: 'ai-chat', label: 'AI Assistant', icon: <Sparkles className="size-4" /> },
  { view: 'settings', label: 'Settings', icon: <Settings className="size-4" /> },
];

export function SidepanelShell({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const currentView = useUIStore((s) => s.currentView);
  const selectedCategory = useUIStore((s) => s.selectedCategory);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const contentScriptReady = useConnectionStore((s) => s.contentScriptReady);
  const activeTools = useToolsStore((s) => s.activeTools);

  const [collapsed, setCollapsed] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const activeToolCount = Object.keys(activeTools).length;

  const isNavActive = (view: View, category?: string) => {
    if (category) return currentView === 'category' && selectedCategory === category;
    return currentView === view;
  };

  const categories = Object.keys(metadataByCategory) as ToolCategory[];

  const sidebarWidth = collapsed ? 'w-12' : 'w-60';

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarWidth} shrink-0 flex flex-col border-r border-border transition-all`}>
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-2 shrink-0">
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight">FDH</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
          </Button>
        </div>

        <Separator />

        {/* Connection Status */}
        <div className="px-2 py-1.5 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={contentScriptReady ? 'default' : 'secondary'}
                  className="cursor-default px-0 justify-center size-6"
                >
                  {contentScriptReady ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {contentScriptReady ? 'Content script active' : 'Open a webpage to use tools'}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Badge
              variant={contentScriptReady ? 'default' : 'secondary'}
              className="gap-1 text-[0.6rem] px-1.5 py-0 cursor-default"
            >
              {contentScriptReady ? <Wifi className="size-2.5" /> : <WifiOff className="size-2.5" />}
              {contentScriptReady ? 'Connected' : 'No page'}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
            {/* Main nav items */}
            {MAIN_NAV.map((item) => {
              const isActive = isNavActive(item.view);
              const button = (
                <Button
                  key={item.view}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size={collapsed ? 'icon' : 'sm'}
                  className={collapsed ? 'w-full size-8 justify-center' : 'w-full justify-start gap-2'}
                  onClick={() => navigateTo(item.view)}
                >
                  {item.icon}
                  {!collapsed && <span className="text-xs">{item.label}</span>}
                </Button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.view}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}

            <Separator className="my-1" />

            {/* Tool categories */}
            {!collapsed && (
              <span className="text-[0.6rem] text-muted-foreground px-2 py-0.5 uppercase tracking-wider">
                Tools
              </span>
            )}
            {collapsed && <Separator className="my-1" />}

            {categories.map((cat) => {
              const isActive = isNavActive('category', cat);
              const icon = CATEGORY_ICONS[cat] ?? <Code className="size-4" />;
              const label = CATEGORY_LABELS[cat] ?? cat;

              const button = (
                <Button
                  key={cat}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size={collapsed ? 'icon' : 'sm'}
                  className={collapsed ? 'w-full size-8 justify-center' : 'w-full justify-start gap-2'}
                  onClick={() => navigateTo('category', { category: cat })}
                >
                  {icon}
                  {!collapsed && <span className="text-xs">{label}</span>}
                </Button>
              );

              if (collapsed) {
                return (
                  <Tooltip key={cat}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex flex-col gap-0.5 px-1.5 py-1.5 shrink-0">
          {/* Active tools count */}
          {activeToolCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? 'icon' : 'sm'}
                  className={collapsed ? 'w-full size-8 justify-center' : 'w-full justify-start gap-2'}
                  onClick={() => navigateTo('dashboard')}
                >
                  <Badge variant="default" className="size-4 p-0 text-[0.55rem] justify-center">
                    {activeToolCount}
                  </Badge>
                  {!collapsed && <span className="text-xs text-muted-foreground">Active tools</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="text-xs">
                  {activeToolCount} active tool{activeToolCount !== 1 ? 's' : ''}
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Command Palette */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={collapsed ? 'w-full size-8 justify-center' : 'w-full justify-start gap-2'}
                onClick={toggleCommandPalette}
              >
                <Terminal className="size-4" />
                {!collapsed && <span className="text-xs">Command Palette</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs">Command Palette (Ctrl+K)</TooltipContent>
            )}
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                className={collapsed ? 'w-full size-8 justify-center' : 'w-full justify-start gap-2'}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {!collapsed && <span className="text-xs">Theme</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="text-xs">Toggle theme</TooltipContent>
            )}
          </Tooltip>

          {!collapsed && (
            <span className="text-[0.55rem] text-muted-foreground text-center">v1.0.0</span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-4">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
