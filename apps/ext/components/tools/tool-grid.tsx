import { ToolCard } from './tool-card';
import type { ToolMetadata } from '@/tools/metadata';

export function ToolGrid({ tools }: { tools: ToolMetadata[] }) {
  if (tools.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-muted-foreground">
        No tools match your search
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {tools.map((tool) => (
        <ToolCard key={tool.id} tool={tool} />
      ))}
    </div>
  );
}
