import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  Command,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/use-ui-store';
import { useToolsStore } from '@/stores/use-tools-store';
import { toolMetadata, metadataByCategory } from '@/tools/metadata';
import type { ToolCategory } from '@/tools/types';

const CATEGORY_LABELS: Record<string, string> = {
  inspection: 'Inspection',
  css: 'CSS',
  responsive: 'Responsive',
  performance: 'Performance',
  accessibility: 'Accessibility',
  ai: 'AI & Smart',
  utility: 'Utilities',
};

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const toggleTool = useToolsStore((s) => s.toggleTool);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleCommandPalette]);

  const handleSelect = (toolId: string) => {
    toggleTool(toolId);
    toggleCommandPalette();
  };

  const handleOpenDetail = (toolId: string) => {
    toggleCommandPalette();
    navigateTo('tool-detail', { toolId });
  };

  const categories = Object.keys(metadataByCategory) as ToolCategory[];

  return (
    <Dialog open={open} onOpenChange={toggleCommandPalette}>
      <DialogContent className="p-0 gap-0 max-w-[340px]">
        <Command className="rounded-lg border-none shadow-none">
          <CommandInput placeholder="Search tools... (type to filter)" className="text-xs" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-xs py-4">No tools found.</CommandEmpty>
            {categories.map((cat) => {
              const tools = metadataByCategory[cat] ?? [];
              if (tools.length === 0) return null;
              return (
                <CommandGroup key={cat} heading={CATEGORY_LABELS[cat] ?? cat} className="text-xs">
                  {tools.map((tool) => (
                    <CommandItem
                      key={tool.id}
                      value={`${tool.name} ${tool.description} ${tool.id}`}
                      onSelect={() => handleSelect(tool.id)}
                      className="text-xs cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{tool.name}</span>
                        <span className="text-muted-foreground ml-1.5 text-[0.6rem]">{tool.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
