import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import { useToolsStore } from '@/stores/use-tools-store';
import { useUIStore } from '@/stores/use-ui-store';
import { toolMetadata } from '@/tools/metadata';
import type { ConfigField } from '@/tools/types';

const ICON_MAP: Record<string, LucideIcon> = {
  Box, Move, Type, Pipette, Ruler, Scan, Cpu, GitBranch, Focus, FileInput,
  Layers, MousePointerClick, Code2, Container: Container as LucideIcon, RefreshCcw,
  Eye, PenTool, Search, Variable, LayoutGrid, Grid3x3, Contrast, Play,
  CheckCircle, Monitor, Wifi, Flame, Gauge, ArrowDown, ShieldCheck,
  Sparkles, Bot, Puzzle, Camera, Database, Image, Smartphone,
  Terminal, FileBarChart,
};

function ConfigFieldRenderer({
  name,
  field,
  value,
  onChange,
}: {
  name: string;
  field: ConfigField;
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}) {
  const val = value ?? field.default;

  switch (field.type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-xs">{field.label}</Label>
          <Switch
            checked={val as boolean}
            onCheckedChange={(v) => onChange(name, v)}
          />
        </div>
      );

    case 'slider':
    case 'number':
      return (
        <div className="flex flex-col gap-1 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">{field.label}</Label>
            <span className="text-[0.65rem] text-muted-foreground">{String(val)}</span>
          </div>
          <Slider
            value={[val as number]}
            onValueChange={([v]) => onChange(name, v)}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
          />
        </div>
      );

    case 'select':
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-xs">{field.label}</Label>
          <Select value={val as string} onValueChange={(v) => onChange(name, v)}>
            <SelectTrigger className="w-28 h-6 text-xs bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-xs">{field.label}</Label>
          <Input
            type="color"
            value={val as string}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-8 h-6 p-0 border-0"
          />
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-between py-2">
          <Label className="text-xs">{field.label}</Label>
          <Input
            value={String(val)}
            onChange={(e) => onChange(name, e.target.value)}
            className="w-28 h-6 text-xs bg-secondary border-0 rounded-md"
          />
        </div>
      );
  }
}

export function ToolDetailPanel() {
  const selectedToolId = useUIStore((s) => s.selectedToolId);
  const activeTools = useToolsStore((s) => s.activeTools);
  const toggleTool = useToolsStore((s) => s.toggleTool);
  const updateToolConfig = useToolsStore((s) => s.updateToolConfig);

  if (!selectedToolId) return null;

  const tool = toolMetadata[selectedToolId];
  if (!tool) return null;

  const toolState = activeTools[selectedToolId];
  const isActive = toolState?.active ?? false;
  const error = toolState?.error;
  const config = toolState?.config ?? {};
  const Icon = ICON_MAP[tool.icon] ?? Box;
  const configFields = tool.configSchema ? Object.entries(tool.configSchema) : [];

  return (
    <ScrollArea className="h-full">
    <div className="flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{tool.name}</div>
          <div className="text-[0.65rem] text-muted-foreground">{tool.description}</div>
        </div>
        <Switch checked={isActive} onCheckedChange={() => toggleTool(tool.id)} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border-l-2 border-destructive px-3 py-2">
          <AlertCircle className="size-3.5 text-destructive shrink-0 mt-0.5" />
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {/* Configuration */}
      {configFields.length > 0 && (
        <>
          <Separator />
          <span className="text-[0.65rem] font-medium text-muted-foreground uppercase tracking-wider">Configuration</span>
          <div>
            {configFields.map(([name, field]) => (
              <ConfigFieldRenderer
                key={name}
                name={name}
                field={field}
                value={config[name]}
                onChange={(fieldName, value) => updateToolConfig(tool.id, { [fieldName]: value })}
              />
            ))}
          </div>
        </>
      )}

      {configFields.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No configuration options for this tool
        </p>
      )}
    </div>
    </ScrollArea>
  );
}
