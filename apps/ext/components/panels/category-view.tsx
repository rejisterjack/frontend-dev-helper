import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Box,
  Palette,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { ToolGrid } from '@/components/tools/tool-grid';
import { useUIStore } from '@/stores/use-ui-store';
import { useToolsStore } from '@/stores/use-tools-store';
import { metadataByCategory } from '@/tools/metadata';
import type { ToolCategory } from '@/tools/types';

const CATEGORY_META: Record<string, { label: string; description: string; icon: LucideIcon }> = {
  inspection: { label: 'Inspection', description: 'Inspect and analyze DOM elements', icon: Box },
  css: { label: 'CSS', description: 'Analyze and edit CSS properties', icon: Palette },
  performance: { label: 'Performance', description: 'Monitor and profile performance', icon: Gauge },
  accessibility: { label: 'Accessibility', description: 'Audit accessibility compliance', icon: ShieldCheck },
  ai: { label: 'AI & Smart', description: 'AI-powered analysis and suggestions', icon: Sparkles },
  utility: { label: 'Utilities', description: 'Screenshots, storage, and more', icon: Wrench },
};

export function CategoryView() {
  const selectedCategory = useUIStore((s) => s.selectedCategory);
  const activeTools = useToolsStore((s) => s.activeTools);
  const deactivateCategory = useToolsStore((s) => s.deactivateCategory);

  if (!selectedCategory) return null;

  const tools = metadataByCategory[selectedCategory as ToolCategory] ?? [];
  const meta = CATEGORY_META[selectedCategory] ?? { label: selectedCategory, description: '', icon: Wrench };
  const CatIcon = meta.icon;
  const activeInCat = tools.filter((t) => activeTools[t.id]?.active).length;

  return (
    <ScrollArea className="h-full">
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CatIcon className="size-4 text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="text-[0.6rem] text-muted-foreground ml-2">{tools.length} tools</span>
          </div>
        </div>
        {activeInCat > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[0.65rem] px-2 text-muted-foreground hover:text-foreground"
            onClick={() => deactivateCategory(selectedCategory)}
          >
            Stop all
          </Button>
        )}
      </div>

      <p className="text-[0.65rem] text-muted-foreground -mt-1">{meta.description}</p>

      <ToolGrid tools={tools} />
    </div>
    </ScrollArea>
  );
}
