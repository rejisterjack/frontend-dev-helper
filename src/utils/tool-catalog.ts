/**
 * Single catalog for command palette, onboarding, and progressive disclosure.
 * Derives display data from TOOL_METADATA where possible.
 */

import {
  MESSAGE_TYPES,
  TOOL_IDS,
  TOOL_METADATA,
  type ToolId,
  getToolShortcut,
} from '@/constants';
import { getToolMessagePrefix } from '@/constants/tool-messages';
import type { Command } from '@/types';
import { logger } from '@/utils/logger';

/** Tools shown first to new users (starter pack). */
export const STARTER_TOOL_IDS: ToolId[] = [
  TOOL_IDS.DOM_OUTLINER,
  TOOL_IDS.SPACING_VISUALIZER,
  TOOL_IDS.COLOR_PICKER,
  TOOL_IDS.CSS_INSPECTOR,
  TOOL_IDS.LAYOUT_VISUALIZER,
  TOOL_IDS.CONTRAST_CHECKER,
  TOOL_IDS.ACCESSIBILITY_AUDIT,
  TOOL_IDS.RESPONSIVE_BREAKPOINT,
  TOOL_IDS.COMMAND_PALETTE,
  TOOL_IDS.NETWORK_ANALYZER,
  TOOL_IDS.SMART_SUGGESTIONS,
];

/** Accent colors for onboarding grid (matches popup overrides where useful). */
export const TOOL_CATALOG_COLORS: Partial<Record<ToolId, string>> = {
  [TOOL_IDS.DOM_OUTLINER]: '#f97316',
  [TOOL_IDS.SPACING_VISUALIZER]: '#8b5cf6',
  [TOOL_IDS.FONT_INSPECTOR]: '#3b82f6',
  [TOOL_IDS.COLOR_PICKER]: '#ec4899',
  [TOOL_IDS.PIXEL_RULER]: '#f59e0b',
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: '#06b6d4',
  [TOOL_IDS.CSS_INSPECTOR]: '#10b981',
  [TOOL_IDS.CONTRAST_CHECKER]: '#84cc16',
  [TOOL_IDS.LAYOUT_VISUALIZER]: '#8b5cf6',
  [TOOL_IDS.ZINDEX_VISUALIZER]: '#f43f5e',
  [TOOL_IDS.TECH_DETECTOR]: '#0ea5e9',
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: '#a855f7',
  [TOOL_IDS.SITE_REPORT]: '#f43f5e',
  [TOOL_IDS.CSS_EDITOR]: '#ec4899',
  [TOOL_IDS.SCREENSHOT_STUDIO]: '#14b8a6',
  [TOOL_IDS.ANIMATION_INSPECTOR]: '#f59e0b',
  [TOOL_IDS.RESPONSIVE_PREVIEW]: '#06b6d4',
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: '#8b5cf6',
  [TOOL_IDS.NETWORK_ANALYZER]: '#22c55e',
  [TOOL_IDS.COMMAND_PALETTE]: '#6366f1',
  [TOOL_IDS.STORAGE_INSPECTOR]: '#0891b2',
  [TOOL_IDS.FOCUS_DEBUGGER]: '#ea580c',
  [TOOL_IDS.FORM_DEBUGGER]: '#7c3aed',
  [TOOL_IDS.COMPONENT_TREE]: '#16a34a',
  [TOOL_IDS.FLAME_GRAPH]: '#dc2626',
  [TOOL_IDS.VISUAL_REGRESSION]: '#db2777',
  [TOOL_IDS.SMART_SUGGESTIONS]: '#f59e0b',
  [TOOL_IDS.ELEMENT_INSPECTOR]: '#6366f1',
  [TOOL_IDS.MEASUREMENT_TOOL]: '#64748b',
  [TOOL_IDS.GRID_OVERLAY]: '#475569',
  [TOOL_IDS.CSS_SCANNER]: '#64748b',
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: '#a855f7',
  [TOOL_IDS.SMART_ELEMENT_PICKER]: '#06b6d4',
  [TOOL_IDS.SESSION_RECORDER]: '#ef4444',
  [TOOL_IDS.PERFORMANCE_BUDGET]: '#f97316',
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: '#14b8a6',
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: '#c026d3',
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: '#7c3aed',
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: '#0d9488',
};

const TOOL_EMOJI_FALLBACK: Partial<Record<ToolId, string>> = {
  [TOOL_IDS.DOM_OUTLINER]: '🕸️',
  [TOOL_IDS.SPACING_VISUALIZER]: '📐',
  [TOOL_IDS.FONT_INSPECTOR]: '🔤',
  [TOOL_IDS.COLOR_PICKER]: '🎨',
  [TOOL_IDS.PIXEL_RULER]: '📏',
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: '📱',
  [TOOL_IDS.CSS_INSPECTOR]: '📝',
  [TOOL_IDS.CONTRAST_CHECKER]: '♿',
  [TOOL_IDS.LAYOUT_VISUALIZER]: '⊞',
  [TOOL_IDS.ZINDEX_VISUALIZER]: '📚',
  [TOOL_IDS.TECH_DETECTOR]: '🔍',
  [TOOL_IDS.NETWORK_ANALYZER]: '🌐',
  [TOOL_IDS.COMMAND_PALETTE]: '⌨️',
  [TOOL_IDS.STORAGE_INSPECTOR]: '💾',
  [TOOL_IDS.FOCUS_DEBUGGER]: '🎯',
  [TOOL_IDS.FORM_DEBUGGER]: '📝',
  [TOOL_IDS.COMPONENT_TREE]: '🌳',
  [TOOL_IDS.FLAME_GRAPH]: '🔥',
  [TOOL_IDS.VISUAL_REGRESSION]: '👁️',
  [TOOL_IDS.SMART_SUGGESTIONS]: '✨',
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: '🛡️',
  [TOOL_IDS.SITE_REPORT]: '📊',
  [TOOL_IDS.CSS_EDITOR]: '✏️',
  [TOOL_IDS.SCREENSHOT_STUDIO]: '📸',
  [TOOL_IDS.ANIMATION_INSPECTOR]: '🎬',
  [TOOL_IDS.RESPONSIVE_PREVIEW]: '📲',
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: '🎨',
  [TOOL_IDS.ELEMENT_INSPECTOR]: '🖱️',
  [TOOL_IDS.MEASUREMENT_TOOL]: '📐',
  [TOOL_IDS.GRID_OVERLAY]: '▦',
  [TOOL_IDS.CSS_SCANNER]: '🔎',
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: '🎨',
  [TOOL_IDS.SMART_ELEMENT_PICKER]: '🎯',
  [TOOL_IDS.SESSION_RECORDER]: '🎥',
  [TOOL_IDS.PERFORMANCE_BUDGET]: '⏱️',
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: '⚛️',
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: '📦',
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: '🔄',
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: '📜',
};

const ICON_HINT_TO_EMOJI: Record<string, string> = {
  'box-select': '🕸️',
  move: '📐',
  type: '🔤',
  pipette: '🎨',
  ruler: '📏',
  monitor: '📱',
  scan: '📝',
  eye: '👁️',
  grid: '⊞',
  layers: '📚',
  search: '🔍',
  activity: '🔥',
  command: '⌨️',
  database: '💾',
  crosshair: '🎯',
  'file-text': '📝',
  'git-branch': '🌳',
  sparkles: '✨',
  accessibility: '🛡️',
  'file-bar-chart': '📊',
  code: '✏️',
  camera: '📸',
  'play-circle': '🎬',
  smartphone: '📲',
  'check-circle': '✅',
  palette: '🎨',
  'mouse-pointer': '🖱️',
  maximize: '📐',
  video: '🎥',
  gauge: '⏱️',
  framework: '⚛️',
  containers: '📦',
  transition: '🔄',
  scroll: '📜',
  'mouse-pointer-click': '🎯',
};

export function getToolCatalogEmoji(toolId: ToolId): string {
  const direct = TOOL_EMOJI_FALLBACK[toolId];
  if (direct) return direct;
  const meta = TOOL_METADATA[toolId];
  if (meta?.icon && ICON_HINT_TO_EMOJI[meta.icon]) {
    return ICON_HINT_TO_EMOJI[meta.icon];
  }
  return '🔧';
}

export interface OnboardingToolEntry {
  toolId: ToolId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export function getOnboardingCatalogTools(): OnboardingToolEntry[] {
  return (Object.keys(TOOL_METADATA) as ToolId[])
    .filter((id) => getToolMessagePrefix(id))
    .map((toolId) => {
      const meta = TOOL_METADATA[toolId];
      return {
        toolId,
        name: meta.name,
        icon: getToolCatalogEmoji(toolId),
        color: TOOL_CATALOG_COLORS[toolId] ?? '#6366f1',
        description: meta.description,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function toolIdToCommandId(toolId: ToolId): string {
  return `toggle-${toolId.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`;
}

function keywordsForTool(toolId: ToolId, name: string, description: string): string[] {
  const words = `${name} ${description} ${toolId}`
    .toLowerCase()
    .split(/[^a-z0-9+]+/g)
    .filter((w) => w.length > 1);
  return [...new Set(words)];
}

async function toggleToolViaBackground(toolId: ToolId): Promise<void> {
  const prefix = getToolMessagePrefix(toolId);
  if (!prefix) return;
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TOGGLE_TOOL,
      payload: { toolId },
    });
  } catch (error) {
    logger.error(`[tool-catalog] Failed to toggle ${toolId}:`, error);
  }
}

/**
 * Palette commands for every tool that has a content-script prefix.
 */
export function buildToolToggleCommands(): Command[] {
  return (Object.keys(TOOL_METADATA) as ToolId[])
    .filter((id) => getToolMessagePrefix(id))
    .map((toolId) => {
      const meta = TOOL_METADATA[toolId];
      return {
        id: toolIdToCommandId(toolId),
        title: `Toggle ${meta.name}`,
        description: meta.description,
        shortcut: meta.shortcut,
        icon: getToolCatalogEmoji(toolId),
        category: 'tool' as const,
        keywords: keywordsForTool(toolId, meta.name, meta.description),
        execute: () => {
          void toggleToolViaBackground(toolId);
        },
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function isStarterTool(toolId: ToolId): boolean {
  return STARTER_TOOL_IDS.includes(toolId);
}

export interface ToolPresetDefinition {
  id: string;
  name: string;
  description: string;
  toolIds: ToolId[];
}

export interface OnboardingShortcutRow {
  key: string;
  description: string;
}

export function getOnboardingShortcutRows(): OnboardingShortcutRow[] {
  const rows: OnboardingShortcutRow[] = [
    { key: 'Ctrl+Shift+F · ⌘⇧F', description: 'Open extension popup' },
    { key: 'Ctrl+Shift+P · ⌘⇧P', description: 'Open command palette' },
    { key: 'Alt+Shift+D', description: 'Disable all tools' },
  ];
  const usedKeys = new Set(rows.map((r) => r.key));
  for (const id of Object.keys(TOOL_METADATA) as ToolId[]) {
    const sk = getToolShortcut(id);
    if (sk && !usedKeys.has(sk)) {
      usedKeys.add(sk);
      rows.push({ key: sk, description: `Toggle ${TOOL_METADATA[id].name}` });
    }
  }
  return rows;
}

export const BUILTIN_TOOL_PRESETS: ToolPresetDefinition[] = [
  {
    id: 'layout-debug',
    name: 'Layout debug',
    description: 'Flex/grid, z-index, spacing',
    toolIds: [
      TOOL_IDS.LAYOUT_VISUALIZER,
      TOOL_IDS.ZINDEX_VISUALIZER,
      TOOL_IDS.SPACING_VISUALIZER,
    ],
  },
  {
    id: 'a11y-pass',
    name: 'Accessibility pass',
    description: 'Audit, contrast, focus',
    toolIds: [
      TOOL_IDS.ACCESSIBILITY_AUDIT,
      TOOL_IDS.CONTRAST_CHECKER,
      TOOL_IDS.FOCUS_DEBUGGER,
    ],
  },
  {
    id: 'performance-pass',
    name: 'Performance pass',
    description: 'Network, flame graph, budgets',
    toolIds: [TOOL_IDS.NETWORK_ANALYZER, TOOL_IDS.FLAME_GRAPH, TOOL_IDS.PERFORMANCE_BUDGET],
  },
  {
    id: 'css-deep-dive',
    name: 'CSS deep dive',
    description: 'Inspector, variables, animations',
    toolIds: [
      TOOL_IDS.CSS_INSPECTOR,
      TOOL_IDS.CSS_VARIABLE_INSPECTOR,
      TOOL_IDS.ANIMATION_INSPECTOR,
    ],
  },
];
