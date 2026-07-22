import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  Box,
  Palette,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wrench,
  Star,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { ToolGrid } from '@/components/tools/tool-grid';
import { useToolsStore } from '@/stores/use-tools-store';
import { useUIStore } from '@/stores/use-ui-store';
import { toolMetadata, metadataByCategory } from '@/tools/metadata';
import type { ToolCategory } from '@/tools/types';

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  inspection: { label: 'Inspection', icon: Box },
  css: { label: 'CSS', icon: Palette },
  performance: { label: 'Performance', icon: Gauge },
  accessibility: { label: 'Accessibility', icon: ShieldCheck },
  ai: { label: 'AI & Smart', icon: Sparkles },
  utility: { label: 'Utilities', icon: Wrench },
};

export function DashboardView() {
  const activeTools = useToolsStore((s) => s.activeTools);
  const deactivateAll = useToolsStore((s) => s.deactivateAll);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const _setSearchQuery = useUIStore((s) => s.setSearchQuery);
  const favoriteToolIds = useUIStore((s) => s.favoriteToolIds);
  const recentToolIds = useUIStore((s) => s.recentToolIds);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);

  const activeCount = Object.values(activeTools).filter((t) => t.active).length;
  const activeToolsList = Object.entries(activeTools)
    .filter(([, state]) => state.active)
    .map(([id]) => toolMetadata[id])
    .filter(Boolean);

  const favoriteTools = favoriteToolIds
    .map((id) => toolMetadata[id])
    .filter(Boolean);

  const recentTools = recentToolIds
    .map((id) => toolMetadata[id])
    .filter(Boolean);

  const allTools = Object.values(toolMetadata);
  const filteredTools = searchQuery
    ? allTools.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : null;

  const categories = Object.keys(metadataByCategory) as ToolCategory[];

  return (
    <ScrollArea className="h-full">
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Search / Command Bar */}
      <button
        onClick={toggleCommandPalette}
        className="flex items-center gap-2 bg-secondary rounded-lg px-3 h-8 text-left w-full"
      >
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-xs text-muted-foreground truncate">
          {searchQuery || 'Search tools...'}
        </span>
        <kbd className="text-[0.6rem] text-muted-foreground/60 font-mono">Ctrl+K</kbd>
      </button>

      {/* Active Tools */}
      {activeCount > 0 && (
        <div className="rounded-lg bg-primary/5 px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Active</span>
              <Badge variant="default" className="text-[0.55rem] px-1.5 py-0 min-w-4 flex items-center justify-center">
                {activeCount}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-5 text-[0.65rem] px-2 text-muted-foreground hover:text-foreground" onClick={deactivateAll}>
              Stop all
            </Button>
          </div>
          <ToolGrid tools={activeToolsList.slice(0, 5)} />
        </div>
      )}

      {/* Search Results */}
      {filteredTools && (
        <div className="flex flex-col gap-2">
          <span className="text-[0.65rem] text-muted-foreground">
            {filteredTools.length} result{filteredTools.length !== 1 ? 's' : ''}
          </span>
          <ToolGrid tools={filteredTools} />
        </div>
      )}

      {/* Favorites */}
      {!filteredTools && favoriteTools.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-1">
            <Star className="size-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Favorites</span>
            <span className="text-[0.6rem] text-muted-foreground/60">{favoriteTools.length}</span>
          </div>
          <ToolGrid tools={favoriteTools.slice(0, 5)} />
        </div>
      )}

      {/* Recent */}
      {!filteredTools && recentTools.length > 0 && (
        <>
          {favoriteTools.length > 0 && <Separator />}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-1">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Recent</span>
              <span className="text-[0.6rem] text-muted-foreground/60">{recentTools.length}</span>
            </div>
            <ToolGrid tools={recentTools.slice(0, 5)} />
          </div>
        </>
      )}

      {/* Categories */}
      {!filteredTools && (
        <div className="flex flex-col gap-3">
          {categories.map((cat, i) => {
            const tools = metadataByCategory[cat] ?? [];
            if (tools.length === 0) return null;
            const meta = CATEGORY_META[cat] ?? { label: cat, icon: Wrench };
            const CatIcon = meta.icon;
            const activeInCat = tools.filter((t) => activeTools[t.id]?.active).length;

            return (
              <div key={cat}>
                {i > 0 && <Separator className="mb-3" />}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 px-1">
                    <CatIcon className="size-3 text-muted-foreground" />
                    <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                    {activeInCat > 0 && (
                      <Badge variant="default" className="text-[0.5rem] px-1.5 py-0 min-w-4 flex items-center justify-center">
                        {activeInCat}
                      </Badge>
                    )}
                    <span className="text-[0.6rem] text-muted-foreground/60">{tools.length}</span>
                  </div>
                  <ToolGrid tools={tools} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </ScrollArea>
  );
}
