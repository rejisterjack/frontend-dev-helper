import type {
  ToolId,
  ToolCategory,
  ExtensionSettings,
  FeatureToggles,
} from "@/lib/types";

export const TOOL_IDS = {
  domOutliner: "dom-outliner",
  spacingVisualizer: "spacing-visualizer",
  fontInspector: "font-inspector",
  colorPicker: "color-picker",
  pixelRuler: "pixel-ruler",
  cssInspector: "css-inspector",
  cssEditor: "css-editor",
  contrastChecker: "contrast-checker",
  layoutVisualizer: "layout-visualizer",
  zIndexVisualizer: "z-index-visualizer",
  techDetector: "tech-detector",
  accessibilityAudit: "accessibility-audit",
  networkAnalyzer: "network-analyzer",
  screenshotStudio: "screenshot-studio",
  animationInspector: "animation-inspector",
  responsivePreview: "responsive-preview",
  designSystemValidator: "design-system-validator",
  commandPalette: "command-palette",
  storageInspector: "storage-inspector",
  focusDebugger: "focus-debugger",
  formDebugger: "form-debugger",
  componentTree: "component-tree",
  flameGraph: "flame-graph",
  visualRegression: "visual-regression",
  smartSuggestions: "smart-suggestions",
  elementInspector: "element-inspector",
  gridOverlay: "grid-overlay",
  cssScanner: "css-scanner",
  cssVariableInspector: "css-variable-inspector",
  smartElementPicker: "smart-element-picker",
  performanceBudget: "performance-budget",
  frameworkDevtools: "framework-devtools",
  containerQueryInspector: "container-query-inspector",
  viewTransitionsDebugger: "view-transitions-debugger",
  scrollAnimationsDebugger: "scroll-animations-debugger",
  breakpointOverlay: "breakpoint-overlay",
  aiAnalyzer: "ai-analyzer",
  focusDebuggerA11y: "focus-debugger-a11y",
  siteReportGenerator: "site-report-generator",
} as const satisfies Record<string, ToolId>;

export const MESSAGE_TYPES = {
  TOGGLE_TOOL: "TOGGLE_TOOL",
  TOOL_STATE_CHANGED: "TOOL_STATE_CHANGED",
  SET_TOOL_STATE: "SET_TOOL_STATE",
  GET_TOOL_STATE: "GET_TOOL_STATE",
  DEACTIVATE_ALL_TOOLS: "DEACTIVATE_ALL_TOOLS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  GET_SETTINGS: "GET_SETTINGS",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  ELEMENT_SELECTED: "ELEMENT_SELECTED",
  PERFORMANCE_DATA: "PERFORMANCE_DATA",
  ACCESSIBILITY_DATA: "ACCESSIBILITY_DATA",
  SITE_REPORT_DATA: "SITE_REPORT_DATA",
  COLOR_REPORT_DATA: "COLOR_REPORT_DATA",
  SEO_REPORT_DATA: "SEO_REPORT_DATA",
  CONTENT_SCRIPT_READY: "CONTENT_SCRIPT_READY",
  POPUP_OPENED: "POPUP_OPENED",
  POPUP_CLOSED: "POPUP_CLOSED",
  EXECUTE_COMMAND: "EXECUTE_COMMAND",
  COMMAND_RESULT: "COMMAND_RESULT",
  LLM_QUERY: "LLM_QUERY",
  LLM_RESPONSE: "LLM_RESPONSE",
  LLM_ERROR: "LLM_ERROR",
  // AI tool requests — previously declared in tool files as string literals
  // with no handler; now declared centrally and routed in background.ts.
  AI_SUGGESTIONS: "AI_SUGGESTIONS",
  AI_AUTO_FIX: "AI_AUTO_FIX",
  // Capture requests from content scripts — must be serviced from the
  // background/service-worker context where chrome.tabs.captureVisibleTab
  // is permitted.
  CAPTURE_TAB: "CAPTURE_TAB",
  CAPTURE_TAB_RESULT: "CAPTURE_TAB_RESULT",
  // Tool-activation bus used by the command palette and session-replay.
  FDH_ACTIVATE_TOOL: "FDH_ACTIVATE_TOOL",
  FDH_TOOL_ACTIVATED: "FDH_TOOL_ACTIVATED",
  FDH_TOOL_DEACTIVATED: "FDH_TOOL_DEACTIVATED",
  VISUAL_REGRESSION_CAPTURE: "VISUAL_REGRESSION_CAPTURE",
  VISUAL_REGRESSION_COMPARE: "VISUAL_REGRESSION_COMPARE",
  VISUAL_REGRESSION_RESULT: "VISUAL_REGRESSION_RESULT",
  CONTEXT_MENU_CLICKED: "CONTEXT_MENU_CLICKED",
  KEYBOARD_SHORTCUT: "KEYBOARD_SHORTCUT",
  INIT_CONTENT_SCRIPT: "INIT_CONTENT_SCRIPT",
  DESTROY_CONTENT_SCRIPT: "DESTROY_CONTENT_SCRIPT",
} as const;

/**
 * Single source of truth for chrome.storage.local keys used across the extension.
 *
 * Phase 1.3 (storage-key drift cleanup): the previous version of this map
 * declared stale names ('fdh-settings', 'fdh-tools-state', 'fdh-llm-config', …)
 * that did not match the actual Zustand persist keys, and the legacy
 * 'fdh-llm-config' write in lib/llm-service.ts was an orphan no reader ever
 * consumed. Both are now aligned to the real keys declared in `stores/*` and
 * `entrypoints/background.ts`.
 *
 * When adding a new persisted store, declare its key here and import from the
 * store — never inline the string literal.
 */
export const STORAGE_KEYS = {
  // Zustand persist keys
  SETTINGS: "fdh-settings-storage",
  TOOLS: "fdh-tools-storage",
  UI: "fdh-ui-storage",
  SUBSCRIPTION: "fdh-subscription-storage",
  CHAT_SESSIONS: "fdh-chat-sessions",
  // Direct chrome.storage.local keys (not Zustand)
  CHAT_HISTORY: "fdh-chat-history",
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  theme: "system",
  fontSize: "medium",
  showTooltips: true,
  autoActivate: false,
  overlayOpacity: 0.8,
  highlightColor: "#3b82f6",
  persistState: true,
  devToolsIntegration: true,
  keyboardShortcuts: true,
  compactMode: false,
  notifications: true,
  animationSpeed: "normal",
};

export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  aiAssistant: true,
  visualRegression: true,
  componentTree: true,
  flameGraph: true,
  performanceBudget: true,
  frameworkDevtools: true,
  containerQueryInspector: true,
  viewTransitionsDebugger: true,
  scrollAnimationsDebugger: true,
  experimentalFeatures: false,
};

export const TOOL_CATEGORIES: {
  id: ToolCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    id: "inspection",
    name: "Inspection",
    icon: "Search",
    description: "Inspect and analyze DOM elements",
    color: "#3b82f6",
  },
  {
    id: "css",
    name: "CSS",
    icon: "Paintbrush",
    description: "CSS editing and visualization tools",
    color: "#8b5cf6",
  },
  {
    id: "performance",
    name: "Performance",
    icon: "Gauge",
    description: "Performance monitoring and profiling",
    color: "#f59e0b",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    icon: "Accessibility",
    description: "Accessibility auditing and testing",
    color: "#10b981",
  },
  {
    id: "ai",
    name: "AI",
    icon: "Sparkles",
    description: "AI-powered analysis and suggestions",
    color: "#ec4899",
  },
  {
    id: "utility",
    name: "Utility",
    icon: "Wrench",
    description: "General utility and productivity tools",
    color: "#64748b",
  },
];

export const COMMAND_TO_TOOL_ID: Record<string, ToolId> = {
  "Ctrl+Shift+D": "dom-outliner",
  "Ctrl+Shift+S": "spacing-visualizer",
  "Ctrl+Shift+F": "font-inspector",
  "Ctrl+Shift+C": "color-picker",
  "Ctrl+Shift+R": "responsive-preview",
  "Ctrl+Shift+E": "css-editor",
  "Ctrl+Shift+K": "contrast-checker",
  "Ctrl+Shift+L": "layout-visualizer",
  "Ctrl+Shift+Z": "z-index-visualizer",
  "Ctrl+Shift+T": "tech-detector",
  "Ctrl+Shift+A": "accessibility-audit",
  "Ctrl+Shift+N": "network-analyzer",
  "Ctrl+Shift+P": "command-palette",
  "Ctrl+Shift+I": "element-inspector",
  "Ctrl+Shift+G": "grid-overlay",
  "Ctrl+Shift+B": "performance-budget",
  "Ctrl+Shift+X": "css-scanner",
  "Ctrl+Shift+V": "css-variable-inspector",
  "Ctrl+Shift+O": "focus-debugger",
  "Ctrl+Shift+Q": "container-query-inspector",
  "Ctrl+Shift+W": "view-transitions-debugger",
  "Ctrl+Shift+H": "scroll-animations-debugger",
} as const;
