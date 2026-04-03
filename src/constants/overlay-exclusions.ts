/**
 * Tools in the same inner array should not run together; enabling one disables others.
 * Keeps conflicting inspection / measurement modes from fighting each other.
 */

import { TOOL_IDS, type ToolId } from '@/constants';

export const OVERLAY_EXCLUSIVE_GROUPS: ToolId[][] = [
  [TOOL_IDS.ELEMENT_INSPECTOR, TOOL_IDS.SMART_ELEMENT_PICKER],
  [TOOL_IDS.PIXEL_RULER, TOOL_IDS.MEASUREMENT_TOOL],
];

const toolToGroup = new Map<ToolId, ToolId[]>();
for (const group of OVERLAY_EXCLUSIVE_GROUPS) {
  for (const id of group) {
    toolToGroup.set(id, group);
  }
}

/** Other tools in the same exclusive group (excluding `toolId`). */
export function getExclusivePeers(toolId: ToolId): ToolId[] {
  const group = toolToGroup.get(toolId);
  if (!group) return [];
  return group.filter((id) => id !== toolId);
}
