import { Switch } from '@/components/ui/switch';
import {
  Box,
  Move,
  Type,
  Pipette,
  Ruler,
  Scan,
  Cpu,
  GitBranch,
  Focus,
  FileInput,
  Layers,
  MousePointerClick,
  Code2,
  Container,
  RefreshCcw,
  Eye,
  PenTool,
  Search,
  Variable,
  LayoutGrid,
  Grid3x3,
  Contrast,
  Play,
  CheckCircle,
  Monitor,
  Wifi,
  Flame,
  Gauge,
  ArrowDown,
  ShieldCheck,
  Sparkles,
  Bot,
  Puzzle,
  Camera,
  Database,
  Image,
  Smartphone,
  Terminal,
  FileBarChart,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { useToolsStore } from '@/stores/use-tools-store';
import { useUIStore } from '@/stores/use-ui-store';
import type { ToolMetadata } from '@/tools/metadata';

const ICON_MAP: Record<string, LucideIcon> = {
  Box, Move, Type, Pipette, Ruler, Scan, Cpu, GitBranch, Focus, FileInput,
  Layers, MousePointerClick, Code2, Container: Container as LucideIcon, RefreshCcw,
  Eye, PenTool, Search, Variable, LayoutGrid, Grid3x3, Contrast, Play,
  CheckCircle, Monitor, Wifi, Flame, Gauge, ArrowDown, ShieldCheck,
  Sparkles, Bot, Puzzle, Camera, Database, Image, Smartphone,
  Terminal, FileBarChart,
};

interface ToolCardProps {
  tool: ToolMetadata;
  showFavorite?: boolean;
}

export function ToolCard({ tool, showFavorite = true }: ToolCardProps) {
  const activeTools = useToolsStore((s) => s.activeTools);
  const toggleTool = useToolsStore((s) => s.toggleTool);
  const navigateTo = useUIStore((s) => s.navigateTo);
  const favoriteToolIds = useUIStore((s) => s.favoriteToolIds);
  const toggleFavorite = useUIStore((s) => s.toggleFavorite);
  const addRecent = useUIStore((s) => s.addRecent);

  const isActive = activeTools[tool.id]?.active ?? false;
  const isFavorite = favoriteToolIds.includes(tool.id);
  const Icon = ICON_MAP[tool.icon] ?? Box;

  const handleNavigate = () => {
    addRecent(tool.id);
    navigateTo('tool-detail', { toolId: tool.id });
  };

  return (
    <div
      className={`group flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer hover:bg-accent/50 ${isActive ? 'bg-primary/5' : ''}`}
      onClick={handleNavigate}
    >
      <div className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="size-3" />
      </div>
      <span className="flex-1 text-xs font-medium leading-tight truncate min-w-0">{tool.name}</span>
      {showFavorite && (
        <button
          className={`shrink-0 size-4 flex items-center justify-center rounded transition-opacity ${isFavorite ? 'opacity-100 text-yellow-500' : 'opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-yellow-500'}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(tool.id);
          }}
          aria-label={isFavorite ? `Unfavorite ${tool.name}` : `Favorite ${tool.name}`}
        >
          <Star className={`size-3 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      )}
      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={isActive}
          onCheckedChange={() => toggleTool(tool.id)}
          className="scale-[0.65] origin-right"
          aria-label={`Toggle ${tool.name}`}
        />
      </div>
    </div>
  );
}
