import type { ToolDefinition } from './types';
import { toolMetadata } from './metadata';

const loadedTools = new Map<string, ToolDefinition>();

export function getToolMetadata(toolId: string) {
  return toolMetadata[toolId] ?? null;
}

export function getAllToolMetadata() {
  return Object.values(toolMetadata);
}

export async function loadTool(toolId: string): Promise<ToolDefinition | null> {
  if (loadedTools.has(toolId)) {
    return loadedTools.get(toolId)!;
  }

  const meta = toolMetadata[toolId];
  if (!meta) return null;

  const module = await meta.loader();
  // Handle both named exports (e.g. { domOutliner: ToolDefinition }) and default-like patterns
  const tool = extractToolDefinition(module, toolId);
  if (!tool) return null;

  loadedTools.set(toolId, tool);
  return tool;
}

function extractToolDefinition(module: Record<string, unknown>, toolId: string): ToolDefinition | null {
  // Look for the ToolDefinition by checking common export patterns
  for (const value of Object.values(module)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'run' in value &&
      (value as { id: string }).id === toolId
    ) {
      return value as ToolDefinition;
    }
  }
  return null;
}

export function isToolLoaded(toolId: string): boolean {
  return loadedTools.has(toolId);
}

export function getLoadedTool(toolId: string): ToolDefinition | null {
  return loadedTools.get(toolId) ?? null;
}
