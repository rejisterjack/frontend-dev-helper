/**
 * Screenshot Studio Constants
 */

export const PREFIX = 'fdh-screenshot-studio';

export const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#ffffff', // white
  '#000000', // black
];

export const DEFAULT_COLOR = '#ef4444';
export const STROKE_WIDTH = 3;
export const BLUR_RADIUS = 8;
export const HANDLE_SIZE = 8;
export const STORAGE_KEY = 'fdh_screenshot_studio_state';

export const TOOL_ICONS: Record<string, string> = {
  select: '↖',
  arrow: '→',
  rectangle: '□',
  circle: '○',
  text: 'T',
  blur: '◐',
};

export const TOOL_NAMES: Record<string, string> = {
  select: 'Select & Move',
  arrow: 'Arrow',
  rectangle: 'Rectangle',
  circle: 'Circle',
  text: 'Text',
  blur: 'Blur',
};

export const TOOL_SHORTCUTS: Record<string, string> = {
  v: 'select',
  r: 'rectangle',
  c: 'circle',
  a: 'arrow',
  t: 'text',
  b: 'blur',
};

export const RESIZE_CURSORS: Record<string, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

export const TOOL_CURSORS: Record<string, string> = {
  select: 'default',
  rectangle: 'crosshair',
  circle: 'crosshair',
  arrow: 'crosshair',
  text: 'text',
  blur: 'crosshair',
};
