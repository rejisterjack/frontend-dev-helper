export interface PageContextData {
  url: string;
  title: string;
  viewport: { width: number; height: number };
  domStats: {
    totalElements: number;
    images: number;
    links: number;
    headings: number;
    scripts: number;
    stylesheets: number;
    forms: number;
    inputs: number;
    imagesWithoutAlt: number;
    inputsWithoutLabel: number;
  };
  headingHierarchy: { level: number; text: string }[];
  performance: {
    domContentLoaded: number;
    loadComplete: number;
    domInteractive: number;
    transferSize: number;
  };
  css: {
    stylesheetCount: number;
    customPropertyCount: number;
    inlineStyles: number;
  };
  storage: {
    localStorageKeys: number;
    sessionStorageKeys: number;
    cookieCount: number;
  };
  meta: Record<string, string>;
  techStack: string[];
  consoleErrors: string[];
}

export type FDHMessage =
  | { type: 'POPUP_ACTIVATE_TOOL'; toolId: string; config?: Record<string, unknown> }
  | { type: 'POPUP_DEACTIVATE_TOOL'; toolId: string }
  | { type: 'POPUP_DEACTIVATE_ALL' }
  | { type: 'POPUP_GET_TAB_STATUS' }
  | { type: 'POPUP_GET_TOOL_STATE'; toolId: string }
  | { type: 'POPUP_GET_ALL_TOOL_STATES' }
  | { type: 'POPUP_GET_SETTINGS' }
  | { type: 'POPUP_UPDATE_SETTINGS'; settings: Record<string, unknown> }
  | { type: 'POPUP_SEND_AI_PROMPT'; content: string; history: { role: string; content: string }[]; tabId?: number }
  | { type: 'POPUP_GET_AI_HISTORY'; tabId?: number }
  | { type: 'POPUP_CLEAR_AI_HISTORY'; tabId?: number }
  | { type: 'BG_ACTIVATE_TOOL'; toolId: string; config?: Record<string, unknown> }
  | { type: 'BG_DEACTIVATE_TOOL'; toolId: string }
  | { type: 'BG_DEACTIVATE_ALL' }
  | { type: 'BG_PING' }
  | { type: 'BG_TOOL_STATE_CHANGED'; toolId: string; enabled: boolean }
  | { type: 'BG_COLLECT_PAGE_CONTEXT' }
  | { type: 'BG_TAB_CONTENT_READY'; tabId: number; supportedTools: string[] }
  | { type: 'CONTENT_TOOL_RESULT'; toolId: string; data: unknown }
  | { type: 'CONTENT_TOOL_ERROR'; toolId: string; error: string }
  | { type: 'CONTENT_READY'; supportedTools: string[] }
  | { type: 'CONTENT_PAGE_CONTEXT'; data: PageContextData }
  | { type: 'CONTENT_PONG' }
  | { type: 'AI_RESPONSE'; messageId: string; content: string; done: boolean; error?: string }
  | { type: 'DEVTOOLS_ACTIVATE_TOOL'; toolId: string; config?: Record<string, unknown>; tabId: number }
  | { type: 'DEVTOOLS_DEACTIVATE_TOOL'; toolId: string; tabId: number }
  | { type: 'DEVTOOLS_DEACTIVATE_ALL'; tabId: number }
  | { type: 'DEVTOOLS_EVAL_RESULT'; requestId: string; result: unknown; isException: boolean }
  | { type: 'DEVTOOLS_GET_PAGE_CONTEXT'; tabId: number }
  | { type: 'VSCODE_JUMP_TO_SOURCE'; payload: { file: string; line: number; column: number } }
  | { type: 'VSCODE_OPEN_IN_EDITOR'; payload: { file: string; line?: number; column?: number } }
  | { type: 'VSCODE_INIT_BRIDGE'; payload: { port: number } }
  | { type: 'VSCODE_GET_STATUS' }
  | { type: 'VSCODE_STATUS'; payload: { connected: boolean } };

export type PopupMessage = Extract<FDHMessage, { type: `POPUP_${string}` }>;
export type BackgroundToContentMessage = Extract<FDHMessage, { type: `BG_${string}` }>;
export type ContentToBackgroundMessage = Extract<FDHMessage, { type: `CONTENT_${string}` }>;
export type DevToolsMessage = Extract<FDHMessage, { type: `DEVTOOLS_${string}` }>;
