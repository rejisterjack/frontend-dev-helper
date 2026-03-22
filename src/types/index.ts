// ============================================
// FrontendDevHelper - TypeScript Types
// ============================================

/** Available tool types in the extension */
export enum ToolType {
  DOM_OUTLINER = 'domOutliner',
  SPACING_VISUALIZER = 'spacingVisualizer',
  FONT_INSPECTOR = 'fontInspector',
  COLOR_PICKER = 'colorPicker',
  PIXEL_RULER = 'pixelRuler',
  RESPONSIVE_BREAKPOINT = 'responsiveBreakpoint',
  CSS_INSPECTOR = 'cssInspector',
  CSS_EDITOR = 'cssEditor',
  CONTRAST_CHECKER = 'contrastChecker',
  LAYOUT_VISUALIZER = 'layoutVisualizer',
  ZINDEX_VISUALIZER = 'zIndexVisualizer',
  TECH_DETECTOR = 'techDetector',
  ACCESSIBILITY_AUDIT = 'accessibilityAudit',
  SITE_REPORT = 'siteReport',
  SCREENSHOT_STUDIO = 'screenshotStudio',
  ANIMATION_INSPECTOR = 'animationInspector',
  RESPONSIVE_PREVIEW = 'responsivePreview',
  DESIGN_SYSTEM_VALIDATOR = 'designSystemValidator',
  NETWORK_ANALYZER = 'networkAnalyzer',
  // New tools for "Best of the Best"
  COMMAND_PALETTE = 'commandPalette',
  STORAGE_INSPECTOR = 'storageInspector',
  FOCUS_DEBUGGER = 'focusDebugger',
  FORM_DEBUGGER = 'formDebugger',
  COMPONENT_TREE = 'componentTree',
  FLAME_GRAPH = 'flameGraph',
  VISUAL_REGRESSION = 'visualRegression',
  AI_SUGGESTIONS = 'aiSuggestions',
}

/** Tool ID type - imported from constants to ensure consistency */
export type { ToolId } from '@/constants';

/** State of an individual tool */
export interface ToolState {
  /** Whether the tool is currently active */
  enabled: boolean;
  /** Tool-specific settings */
  settings?: Record<string, unknown>;
}

/** Map of all tool states */
export type ToolsState = Record<ToolId, ToolState>;

/** Tool metadata for display */
export interface ToolMeta {
  type: ToolType;
  name: string;
  description: string;
  icon: string;
  hasSettings: boolean;
  color: string;
}

// ============================================
// Message Types for Extension Communication
// ============================================

/** Base message interface */
export interface BaseMessage {
  type: string;
}

/** Message to toggle a tool on/off */
export interface ToggleToolMessage extends BaseMessage {
  type: 'TOGGLE_TOOL';
  tool: ToolType;
  enabled: boolean;
}

/** Message to get current state */
export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
}

/** Message with current state response */
export interface StateResponseMessage extends BaseMessage {
  type: 'STATE_RESPONSE';
  state: ToolsState;
}

/** Message to update tool settings */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  tool: ToolType;
  settings: Record<string, unknown>;
}

/** Message to open settings panel */
export interface OpenSettingsMessage extends BaseMessage {
  type: 'OPEN_SETTINGS';
  tool: ToolType;
}

/** Message to reset all tools */
export interface ResetToolsMessage extends BaseMessage {
  type: 'RESET_TOOLS';
}

/** Message to capture screenshot */
export interface CaptureScreenshotMessage extends BaseMessage {
  type: 'CAPTURE_SCREENSHOT';
}

/** Union type of all popup messages */
export type PopupMessage =
  | ToggleToolMessage
  | GetStateMessage
  | StateResponseMessage
  | UpdateSettingsMessage
  | OpenSettingsMessage
  | ResetToolsMessage
  | CaptureScreenshotMessage;

/** Message sent from content script */
export interface ContentScriptMessage extends BaseMessage {
  type: 'TOOL_STATE_CHANGED' | 'COLOR_PICKED' | 'MEASUREMENT_COMPLETE';
  data?: unknown;
}

/** Extension message type */
export interface ExtensionMessage {
  type: string;
  payload?: unknown;
  id?: string;
  timestamp?: number;
}

/** Message response type */
export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  id?: string;
}

// ============================================
// Settings Types
// ============================================

/** DOM Outliner settings */
export interface DOMOutlinerSettings {
  showLabels: boolean;
  opacity: number;
  outlineWidth: number;
}

/** Spacing Visualizer settings */
export interface SpacingVisualizerSettings {
  showMargins: boolean;
  showPadding: boolean;
  showGaps: boolean;
  color: string;
}

/** Font Inspector settings */
export interface FontInspectorSettings {
  showComputed: boolean;
  showFallbacks: boolean;
  highlightIssues: boolean;
}

/** Color Picker settings */
export interface ColorPickerSettings {
  format: 'hex' | 'rgb' | 'hsl';
  showContrast: boolean;
  copyOnPick: boolean;
}

/** Pixel Ruler settings */
export interface PixelRulerSettings {
  showGuides: boolean;
  snapToElements: boolean;
  showCoordinates: boolean;
}

/** Responsive Breakpoint settings */
export interface ResponsiveBreakpointSettings {
  showOverlay: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  customBreakpoints: number[];
}

/** Element Inspector settings */
export interface ElementInspectorSettings {
  showTooltips: boolean;
  highlightStyles: boolean;
}

/** Union of all tool settings */
export type ToolSettings =
  | DOMOutlinerSettings
  | SpacingVisualizerSettings
  | FontInspectorSettings
  | ColorPickerSettings
  | PixelRulerSettings
  | ResponsiveBreakpointSettings
  | ElementInspectorSettings;

// ============================================
// Extension Settings
// ============================================

/** Feature toggles */
export interface FeatureToggles {
  domOutliner: boolean;
  spacingVisualizer: boolean;
  fontInspector: boolean;
  colorPicker: boolean;
  pixelRuler: boolean;
  breakpointOverlay: boolean;
  elementInspector: boolean;
  gridOverlay: boolean;
  measureTool: boolean;
  cssScanner: boolean;
  breakpointVisualizer: boolean;
  networkAnalyzer: boolean;
  // New "Best of the Best" Tools
  commandPalette: boolean;
  storageInspector: boolean;
  focusDebugger: boolean;
  formDebugger: boolean;
  componentTree: boolean;
  flameGraph: boolean;
  visualRegression: boolean;
  aiSuggestions: boolean;
}

/** Default feature toggles */
export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  domOutliner: true,
  spacingVisualizer: true,
  fontInspector: true,
  colorPicker: true,
  pixelRuler: true,
  breakpointOverlay: true,
  elementInspector: true,
  gridOverlay: true,
  measureTool: true,
  cssScanner: false,
  breakpointVisualizer: false,
  networkAnalyzer: false,
  // New "Best of the Best" Tools
  commandPalette: true,
  storageInspector: false,
  focusDebugger: false,
  formDebugger: false,
  componentTree: false,
  flameGraph: false,
  visualRegression: false,
  aiSuggestions: true,
};

/** Extension settings */
export interface ExtensionSettings {
  features: FeatureToggles;
  theme: 'light' | 'dark' | 'system';
  shortcuts: Record<string, string>;
  autoSave: boolean;
  autoOpenDevTools: boolean;
}

// ============================================
// Storage Types
// ============================================

/** Storage area type */
export type StorageArea = 'local' | 'session' | 'sync';

/** Storage item */
export interface StorageItem<T = unknown> {
  key: string;
  value: T;
  area: StorageArea;
  timestamp?: number;
}

/** Extension storage interface */
export interface ExtensionStorage {
  get<T>(key: string, area?: StorageArea): Promise<T | null>;
  set<T>(key: string, value: T, area?: StorageArea): Promise<void>;
  remove(key: string, area?: StorageArea): Promise<void>;
  clear(area?: StorageArea): Promise<void>;
}

// ============================================
// UI Types
// ============================================

/** UI Tab type */
export interface UITab {
  id: string;
  label: string;
  icon?: string;
}

/** Async state */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ============================================
// Element Types
// ============================================

/** Element info */
export interface ElementInfo {
  tag: string;
  id: string | null;
  class: string | null;
  selector: string;
  dimensions: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: Record<string, string>;
  text: string | null;
  children: number;
}

// ============================================
// Performance Types
// ============================================

/** Performance metrics */
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  resourceCount: number;
  totalTransferSize: number;
}

/** Web Vitals metrics */
export interface WebVitals {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  inp: number | null;
}

/** Resource analysis */
export interface ResourceAnalysis {
  totalRequests: number;
  totalSize: number;
  transferSize: number;
  byType?: Record<string, number>;
  slowestResources?: Array<{ url: string; duration: number; size: number }>;
}

/** Memory info */
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// ============================================
// Site Report Types
// ============================================

/** Comprehensive site report */
export interface SiteReport {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
    overall: number;
  };
  performance: PerformanceReportData;
  accessibility: AccessibilityReport;
  colors: ColorReportData;
  seo: SEOReportData;
  techStack: TechStackInfo;
  bestPractices: BestPracticesReport;
  recommendations: SiteReportRecommendation[];
}

export interface PerformanceReportData {
  webVitals: {
    lcp: MetricScore;
    fid: MetricScore;
    cls: MetricScore;
    fcp: MetricScore;
    ttfb: MetricScore;
    inp: MetricScore;
  };
  navigation: {
    dnsLookup: number;
    tcpConnection: number;
    tlsHandshake: number;
    serverResponse: number;
    domProcessing: number;
    resourceLoading: number;
    totalLoad: number;
  };
  resources: {
    totalRequests: number;
    totalSize: number;
    transferSize: number;
    byType: Record<string, number>;
    slowestResources: Array<{ url: string; type: string; duration: number; size: number }>;
    renderBlocking: Array<{
      url: string;
      type: 'stylesheet' | 'script';
      size: number;
      blockingTime: number;
    }>;
  };
  memory: MemoryInfo | null;
  imageOptimizations: Array<{
    url: string;
    currentSize: number;
    currentFormat: string;
    displayWidth: number;
    displayHeight: number;
    naturalWidth: number;
    naturalHeight: number;
    recommendations: string[];
    potentialSavings: number;
  }>;
}

export interface MetricScore {
  value: number | null;
  unit: string;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface ColorReportData {
  totalColors: number;
  dominant: Array<{
    hex: string;
    rgb: { r: number; g: number; b: number };
    hsl: { h: number; s: number; l: number };
    frequency: number;
  }>;
  harmonies: {
    complementary: string[];
    analogous: string[];
    triadic: string[];
    splitComplementary: string[];
    tetradic: string[];
    monochromatic: string[];
  };
  categories: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
    semantic: {
      success: string[];
      warning: string[];
      error: string[];
      info: string[];
    };
  };
  contrastIssues: ContrastIssue[];
}

export interface SEOReportData {
  score: number;
  meta: {
    title: { content: string; length: number; optimal: boolean };
    description: { content: string | null; length: number; optimal: boolean };
    canonical: string | null;
    robots: string | null;
    viewport: string | null;
    charset: string;
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
    issues: SEOIssue[];
  };
  headings: {
    h1: Array<{ text: string; selector: string }>;
    h2: Array<{ text: string; selector: string }>;
    h3: Array<{ text: string; selector: string }>;
    h4: Array<{ text: string; selector: string }>;
    h5: Array<{ text: string; selector: string }>;
    h6: Array<{ text: string; selector: string }>;
    hierarchyValid: boolean;
    issues: SEOIssue[];
  };
  links: {
    internal: number;
    external: number;
    broken: number;
    nofollow: number;
    total: number;
    issues: SEOIssue[];
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    issues: SEOIssue[];
  };
  mobile: {
    viewportSet: boolean;
    responsive: boolean;
    fontSizeReadable: boolean;
    touchTargetsAppropriate: boolean;
  };
  structuredData: {
    hasJsonLd: boolean;
    hasMicrodata: boolean;
    hasRdfa: boolean;
    schemas: string[];
  };
  content: {
    wordCount: number;
    readingTime: number;
    paragraphCount: number;
    hasInternalLinks: boolean;
    hasExternalLinks: boolean;
  };
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  recommendation: string;
}

export interface BestPracticesReport {
  https: boolean;
  deprecatedAPIs: string[];
  consoleErrors: number;
  consoleWarnings: number;
  deprecatedElements: string[];
  doctypeCorrect: boolean;
  charsetSet: boolean;
  issues: BestPracticeIssue[];
}

export interface BestPracticeIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation: string;
}

export interface SiteReportRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
}

export type ReportFormat = 'html' | 'pdf' | 'json' | 'markdown';

export interface ReportOptions {
  sections?: {
    performance?: boolean;
    accessibility?: boolean;
    colors?: boolean;
    seo?: boolean;
    techStack?: boolean;
    bestPractices?: boolean;
  };
  format?: ReportFormat;
  includeScreenshot?: boolean;
  filename?: string;
}

// ============================================
// Context Menu Types
// ============================================

/** Context menu config */
export interface ContextMenuConfig {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  parentId?: string;
  enabled?: boolean;
  onclick?: (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void;
}

// ============================================
// Command Palette Types
// ============================================

/** Command palette item */
export interface Command {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  category: 'tool' | 'action' | 'setting' | 'navigation';
  keywords: string[];
  execute: () => void | Promise<void>;
  disabled?: boolean;
}

/** Command palette state */
export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  recentCommands: string[];
  filteredCommands: Command[];
}

// ============================================
// Storage Inspector Types
// ============================================

/** Storage item for LocalStorage/SessionStorage (Storage Inspector tool) */
export interface StorageInspectorItem {
  key: string;
  value: string;
  size: number;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  area?: StorageArea;
}

/** IndexedDB database info */
export interface IndexedDBDatabase {
  name: string;
  version: number;
  objectStores: IndexedDBObjectStore[];
}

/** IndexedDB object store info */
export interface IndexedDBObjectStore {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: IndexedDBIndex[];
  count: number;
}

/** IndexedDB index info */
export interface IndexedDBIndex {
  name: string;
  keyPath: string | string[];
  unique: boolean;
  multiEntry: boolean;
}

/** Cookie info */
export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite?: chrome.cookies.SameSiteStatus;
}

/** Cache storage entry */
export interface CacheEntry {
  url: string;
  size: number;
  headers: Record<string, string>;
}

/** Complete storage snapshot */
export interface StorageSnapshot {
  localStorage: StorageInspectorItem[];
  sessionStorage: StorageInspectorItem[];
  indexedDB: IndexedDBDatabase[];
  cookies: CookieInfo[];
  cacheStorage: { [cacheName: string]: CacheEntry[] };
}

// ============================================
// AI Suggestion Types
// ============================================

/** AI suggestion category */
export type AISuggestionCategory =
  | 'accessibility'
  | 'performance'
  | 'seo'
  | 'best-practice'
  | 'security';

/** AI suggestion priority */
export type AISuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

/** AI suggestion item */
export interface AISuggestion {
  id: string;
  category: AISuggestionCategory;
  priority: AISuggestionPriority;
  title: string;
  description: string;
  element?: string;
  selector?: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  confidence: number;
  autoFixable: boolean;
  fix?: () => boolean | Promise<boolean>;
}

/** AI analysis result */
export interface AIAnalysisResult {
  timestamp: number;
  url: string;
  suggestions: AISuggestion[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    autoFixable: number;
    byCategory: Record<AISuggestionCategory, number>;
  };
}

// ============================================
// Component Tree Types
// ============================================

/** Detected framework */
export type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'unknown';

/** Component tree node */
export interface ComponentNode {
  id: string;
  name: string;
  type: 'component' | 'element' | 'text' | 'fragment';
  framework: FrameworkType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  children: ComponentNode[];
  depth: number;
  domElement?: HTMLElement;
  isExpanded?: boolean;
  hasChildren: boolean;
}

/** Component tree state */
export interface ComponentTreeState {
  framework: FrameworkType;
  root: ComponentNode | null;
  selectedNode: ComponentNode | null;
  expandedNodes: Set<string>;
  filter: string;
}

// ============================================
// Performance Flame Graph Types
// ============================================

/** Performance entry for flame graph */
export interface FlameGraphEntry {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  endTime: number;
  children: FlameGraphEntry[];
  parent?: FlameGraphEntry;
  depth: number;
  type: 'script' | 'layout' | 'paint' | 'composite' | 'other';
  source?: string;
  line?: number;
}

/** Performance profile */
export interface PerformanceProfile {
  timestamp: number;
  url: string;
  entries: FlameGraphEntry[];
  summary: {
    totalDuration: number;
    scriptTime: number;
    layoutTime: number;
    paintTime: number;
    longTasks: number;
  };
}

// ============================================
// Focus Debugger Types
// ============================================

/** Focusable element info */
export interface FocusableElement {
  element: HTMLElement;
  selector: string;
  tabIndex: number;
  tabOrder: number;
  isVisible: boolean;
  isDisabled: boolean;
  ariaLabel?: string;
}

/** Focus history entry */
export interface FocusHistoryEntry {
  timestamp: number;
  element: string;
  selector: string;
  trigger: 'keyboard' | 'mouse' | 'script';
}

/** Focus debugger state */
export interface FocusDebuggerState {
  enabled: boolean;
  showOverlay: boolean;
  focusableElements: FocusableElement[];
  focusHistory: FocusHistoryEntry[];
  trapDetected: boolean;
  trapElements: HTMLElement[];
}

// ============================================
// Form Debugger Types
// ============================================

/** Form field info */
export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  selector: string;
  name: string;
  type: string;
  value: string;
  isValid: boolean;
  validationMessage: string;
  isRequired: boolean;
  hasLabel: boolean;
  labelText?: string;
  hasError: boolean;
  autofill?: string;
}

/** Form info */
export interface FormInfo {
  element: HTMLFormElement;
  selector: string;
  name?: string;
  action: string;
  method: string;
  fields: FormField[];
  isValid: boolean;
  hasSubmitHandler: boolean;
  autofillEnabled: boolean;
  accessibilityIssues: string[];
}

/** Form debugger state */
export interface FormDebuggerState {
  enabled: boolean;
  forms: FormInfo[];
  selectedForm: FormInfo | null;
  highlightIssues: boolean;
}

// ============================================
// Visual Regression Types
// ============================================

/** Baseline screenshot */
export interface BaselineScreenshot {
  id: string;
  url: string;
  pathname: string;
  timestamp: number;
  screenshot: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
}

/** Diff result */
export interface DiffResult {
  match: boolean;
  diffPercentage: number;
  pixelsDifferent: number;
  totalPixels: number;
  diffImage?: string;
  threshold: number;
}

/** Visual regression test */
export interface VisualRegressionTest {
  id: string;
  url: string;
  baselineId: string;
  timestamp: number;
  result: DiffResult;
  status: 'pending' | 'passed' | 'failed' | 'approved';
}

/** Visual regression settings */
export interface VisualRegressionSettings {
  threshold: number;
  ignoreDynamicContent: boolean;
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }>;
}

/** Visual regression state */
export interface VisualRegressionState {
  baselines: BaselineScreenshot[];
  tests: VisualRegressionTest[];
  selectedBaseline?: string;
  threshold: number;
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }>;
}

/** Visual regression message response types */
export interface VisualRegressionStateResponse {
  state: VisualRegressionState;
}

export interface VisualRegressionBaselineResponse {
  baseline: BaselineScreenshot;
}

export interface VisualRegressionTestResponse {
  test: VisualRegressionTest;
}

export interface VisualRegressionExportResponse {
  data: {
    baselines: BaselineScreenshot[];
    tests: VisualRegressionTest[];
    exportedAt: number;
  };
}

export interface VisualRegressionImportResponse {
  success: boolean;
}

// ============================================
// Content Script Handler Types
// ============================================

/** Content script state interface */
export interface ContentScriptState {
  inspector: unknown;
  measureTool: unknown;
  gridOverlay: unknown;
  isInspectorActive: boolean;
  isColorPickerActive: boolean;
  isMeasureToolActive: boolean;
  isGridVisible: boolean;
  isScreenshotStudioActive: boolean;
  domOutlinerEnabled: boolean;
  spacingVisualizerEnabled: boolean;
  fontInspectorEnabled: boolean;
  pixelRulerEnabled: boolean;
  breakpointOverlayEnabled: boolean;
  responsivePreviewEnabled: boolean;
  // Additional tool states for handler registry
  isCssInspectorActive: boolean;
  isCssEditorActive: boolean;
  isContrastCheckerActive: boolean;
  isLayoutVisualizerActive: boolean;
  isZIndexVisualizerActive: boolean;
  isTechDetectorActive: boolean;
  isAccessibilityAuditActive: boolean;
  isNetworkAnalyzerActive: boolean;
  isSiteReportActive: boolean;
  isAnimationInspectorActive: boolean;
  isDesignSystemValidatorActive: boolean;
  isFlameGraphActive: boolean;
  isFocusDebuggerActive: boolean;
  isFormDebuggerActive: boolean;
  isCommandPaletteActive: boolean;
  isStorageInspectorActive: boolean;
  isComponentTreeActive: boolean;
  isVisualRegressionActive: boolean;
  isAiSuggestionsActive: boolean;
}

/**
 * Content handler function type
 * @returns true if async (to keep message channel open), undefined/false if sync
 */
export type ContentHandler = (
  payload: Record<string, unknown> | undefined,
  state: ContentScriptState,
  sendResponse: (response: Record<string, unknown>) => void
  // biome-ignore lint/suspicious/noConfusingVoidType: void needed for sync handlers
) => boolean | undefined | void;

/** Handler registry type */
export type HandlerRegistry = Record<string, ContentHandler>;
