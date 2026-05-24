export type ToolCategory =
  | 'inspection'
  | 'css'
  | 'performance'
  | 'accessibility'
  | 'ai'
  | 'utility';

export interface ConfigField {
  type: 'boolean' | 'string' | 'number' | 'select' | 'color' | 'slider';
  label: string;
  default: unknown;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ToolContext {
  onInvalidated: (callback: () => void) => void;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  configSchema?: Record<string, ConfigField>;
  run: (ctx: ToolContext, config?: Record<string, unknown>) => () => void;
}
