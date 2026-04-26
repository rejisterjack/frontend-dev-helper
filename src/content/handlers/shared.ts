/**
 * Shared handler utilities
 *
 * Provides the createToolHandlers factory used by every per-tool handler file.
 */

import type { ContentHandler, ContentScriptState } from '@/types';

/**
 * Standard tool interface that createToolHandlers expects.
 * Every tool module must expose these four methods.
 */
export interface StandardTool {
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  getState: () => { enabled: boolean };
}

/** Type-safe state mutator helper */
const setState = (
  state: ContentScriptState,
  key: keyof ContentScriptState,
  value: boolean,
): void => {
  (state as Record<keyof ContentScriptState, boolean>)[key] = value;
};

/**
 * Creates the four standard handlers for a tool:
 *   TOOL_ENABLE, TOOL_DISABLE, TOOL_TOGGLE, TOOL_GET_STATE
 */
export function createToolHandlers(
  toolName: string,
  tool: StandardTool,
  stateKey: keyof ContentScriptState,
): Record<string, ContentHandler> {
  return {
    [`${toolName}_ENABLE`]: (_payload, state, sendResponse) => {
      tool.enable();
      const newState = tool.getState();
      setState(state, stateKey, newState.enabled);
      sendResponse({ success: true, active: newState.enabled });
    },
    [`${toolName}_DISABLE`]: (_payload, state, sendResponse) => {
      tool.disable();
      const newState = tool.getState();
      setState(state, stateKey, newState.enabled);
      sendResponse({ success: true, active: newState.enabled });
    },
    [`${toolName}_TOGGLE`]: (_payload, state, sendResponse) => {
      tool.toggle();
      const newState = tool.getState();
      setState(state, stateKey, newState.enabled);
      sendResponse({ success: true, active: newState.enabled });
    },
    [`${toolName}_GET_STATE`]: (_payload, _state, sendResponse) => {
      sendResponse({ success: true, state: tool.getState() });
    },
  };
}
