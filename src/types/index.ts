/**
 * FrontendDevHelper - TypeScript Types
 *
 * Central type definitions for the extension.
 * For tool-specific types, see src/types/tools.ts
 */

// ============================================
// Re-exports from tools.ts (Unified Tool Types)
// ============================================

export type {
  SmartSuggestionsSettings,
  AnimationInspectorSettings,
  CategorizedTool,
  ColorPickerSettings,
  CSSInspectorSettings,
  // Settings types
  DOMOutlinerSettings,
  ElementInspectorSettings,
  FontInspectorSettings,
  LayoutVisualizerSettings,
  PixelRulerSettings,
  ResponsiveBreakpointSettings,
  SpacingVisualizerSettings,
  // Message types
  ToggleToolPayload,
  // Category types
  ToolCategory,
  ToolCategoryMeta,
  // Registry types
  ToolHandler,
  // Core tool types
  ToolId,
  ToolMeta,
  ToolRegistration,
  ToolRegistry,
  ToolSettings,
  ToolState,
  ToolStateChangeEvent,
  ToolsState,
  ToolType,
  ZIndexVisualizerSettings,
} from './tools';

// Import ToolId for use in this file
import type { ToolId } from './tools';

// ============================================
// Message Types for Extension Communication
// ============================================

/** Base message interface */
export interface BaseMessage {
  type: string;
}

/** Message to toggle a tool on/off (using unified ToolId) */
export interface ToggleToolMessage extends BaseMessage {
  type: 'TOGGLE_TOOL';
  toolId: ToolId;
  enabled: boolean;
}

/** @deprecated Use TOGGLE_TOOL with toolId instead */
export interface LegacyToggleToolMessage extends BaseMessage {
  type: 'TOGGLE_TOOL';
  tool: string;
  enabled: boolean;
}

/** Message to get current state */
export interface GetStateMessage extends BaseMessage {
  type: 'GET_STATE';
}

/** Message with current state response */
export interface StateResponseMessage extends BaseMessage {
  type: 'STATE_RESPONSE';
  state: import('./tools').ToolsState;
}

/** Message to update tool settings */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  toolId: ToolId;
  settings: Record<string, unknown>;
}

/** Message to open settings panel */
export interface OpenSettingsMessage extends BaseMessage {
  type: 'OPEN_SETTINGS';
  toolId: ToolId;
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

/**
 * Feature toggles - maps tool IDs to their enabled state
 * Uses the canonical ToolId type for type safety
 */
export type FeatureToggles = Record<ToolId, boolean>;

/**
 * Default feature toggles - aligned with TOOL_IDS
 * Note: These are now imported from constants to maintain single source of truth
 */
export const DEFAULT_FEATURE_TOGGLES: FeatureToggles = {
  // Core tools
  domOutliner: true,
  spacingVisualizer: true,
  fontInspector: true,
  colorPicker: true,
  pixelRuler: true,
  responsiveBreakpoint: true,
  cssInspector: true,
  contrastChecker: true,
  layoutVisualizer: true,
  zIndexVisualizer: true,
  techDetector: true,
  networkAnalyzer: false,
  elementInspector: true,
  measurementTool: true,
  gridOverlay: false,
  cssScanner: false,
  // Advanced tools
  cssVariableInspector: false,
  smartElementPicker: false,
  sessionRecorder: false,
  performanceBudget: false,
  frameworkDevtools: false,
  // New "Best of the Best" Tools
  commandPalette: true,
  storageInspector: false,
  focusDebugger: false,
  formDebugger: false,
  componentTree: false,
  flameGraph: false,
  visualRegression: false,
  smartSuggestions: true,
  // Additional tools
  accessibilityAudit: false,
  siteReport: false,
  cssEditor: false,
  screenshotStudio: false,
  animationInspector: false,
  responsivePreview: false,
  designSystemValidator: false,
  // Beast Mode: Next-Gen Features
  containerQueryInspector: false,
  viewTransitionsDebugger: false,
  scrollAnimationsDebugger: false,
};

/** Extension settings */
export interface ExtensionSettings {
  features: FeatureToggles;
  theme: 'light' | 'dark' | 'system';
  shortcuts: Record<string, string>;
  autoSave: boolean;
  autoOpenDevTools: boolean;
  experimentalFeatures?: boolean;
  ai?: {
    enabled: boolean;
    autoAnalyze: boolean;
    categories: {
      accessibility: boolean;
      performance: boolean;
      seo: boolean;
      bestPractice: boolean;
      security: boolean;
    };
  };
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
  version?: number;
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
  disabled?: boolean;
  badge?: string | number;
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
  classes?: string[];
  selector: string;
  dimensions: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  rect?: {
    width: number;
    height: number;
    top: number;
    left: number;
  };
  styles: Record<string, string>;
  inlineStyles?: Record<string, string>;
  text: string | null;
  children: number;
  aria?: Record<string, string | null>;
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
// Accessibility Report Types
// ============================================

/** Accessibility issue severity */
export type AccessibilityIssueSeverity = 'error' | 'warning' | 'info';

/** ARIA issue */
export interface ARIAIssue {
  element: string;
  selector: string;
  issue: string;
  severity: AccessibilityIssueSeverity;
}

/** Focus order item */
export interface FocusOrderItem {
  element: string;
  selector: string;
  tabIndex: number;
  order: number;
}

/** Contrast issue */
export interface ContrastIssue {
  element: string;
  selector: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  severity?: 'error' | 'warning' | 'info';
}

/** Alt text issue */
export interface AltTextIssue {
  element: string;
  selector: string;
  src: string;
}

/** Form label issue */
export interface FormLabelIssue {
  element: string;
  selector: string;
  id: string;
}

/** Comprehensive accessibility report */
export interface AccessibilityReport {
  timestamp: number;
  url: string;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
  aria: {
    issues: ARIAIssue[];
    count: number;
  };
  focusOrder: {
    items: FocusOrderItem[];
    issues: FocusOrderItem[];
    count: number;
  };
  contrast: {
    issues: ContrastIssue[];
    count: number;
  };
  altText: {
    issues: AltTextIssue[];
    count: number;
  };
  formLabels: {
    issues: FormLabelIssue[];
    count: number;
  };
}

// ============================================
// Site Report Types
// ============================================

/** Tech stack information */
export interface TechStackInfo {
  frameworks: string[];
  libraries: string[];
  detected: Record<string, string | boolean>;
}

/** Metric score */
export interface MetricScore {
  value: number | null;
  unit: string;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/** Performance report data */
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

/** Color report data */
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

/** SEO issue */
export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  recommendation: string;
}

/** SEO report data */
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

/** Best practice issue */
export interface BestPracticeIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation: string;
}

/** Best practices report */
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

/** Site report recommendation */
export interface SiteReportRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
}

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
  performance: PerformanceReportData | null;
  accessibility: AccessibilityReport | null;
  colors: ColorReportData | null;
  seo: SEOReportData | null;
  techStack: TechStackInfo | null;
  bestPractices: BestPracticesReport | null;
  recommendations: SiteReportRecommendation[];
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
// LLM / AI Provider Types
// ============================================

/** AI provider type */
export type AIProvider = 'openrouter' | 'custom';

/** LLM configuration */
export interface LLMConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
  useFreeModelsOnly: boolean;
  categories?: {
    accessibility: boolean;
    performance: boolean;
    seo: boolean;
    bestPractice: boolean;
    security: boolean;
  };
}

/** LLM request message */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** LLM request payload */
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/** LLM response choice */
export interface LLMChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

/** LLM API response */
export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** LLM suggestion from AI analysis */
export interface LLMSuggestion {
  category: AISuggestionCategory;
  priority: AISuggestionPriority;
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  element?: string;
  selector?: string;
  autoFixable: boolean;
  suggestedFix?: string;
}

/** Page context for LLM analysis */
export interface LLMPageContext {
  url: string;
  title: string;
  meta: {
    description?: string;
    viewport?: string;
  };
  techStack: string[];
  domStats: {
    totalElements: number;
    images: number;
    links: number;
    headings: number;
  };
}

/** Default LLM configuration */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openrouter',
  apiKey: '',
  model: 'openrouter/quasar-alpha',
  enabled: true,
  useFreeModelsOnly: true,
};

/** Available OpenRouter models (free tier) */
export const OPENROUTER_FREE_MODELS = [
  {
    id: 'openrouter/quasar-alpha',
    name: 'Quasar Alpha (Free)',
    description: "OpenRouter's free model",
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    description: "Google's fast multimodal model",
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek V3 (Free)',
    description: "DeepSeek's chat model",
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    description: "Meta's large instruction model",
  },
];

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

/** Content script state interface - Unified naming convention */
export interface ContentScriptState {
  inspector: unknown;
  measureTool: unknown;
  gridOverlay: unknown;
  // Unified is{ToolName}Active naming
  isInspectorActive: boolean;
  isColorPickerActive: boolean;
  isMeasureToolActive: boolean;
  isGridVisible: boolean;
  isScreenshotStudioActive: boolean;
  isDomOutlinerActive: boolean;
  isSpacingVisualizerActive: boolean;
  isFontInspectorActive: boolean;
  isPixelRulerActive: boolean;
  isBreakpointOverlayActive: boolean;
  isResponsivePreviewActive: boolean;
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
  isSmartSuggestionsActive: boolean;
  // Advanced tools
  isCssVariableInspectorActive: boolean;
  isSmartElementPickerActive: boolean;
  isSessionRecorderActive: boolean;
  isPerformanceBudgetActive: boolean;
  isFrameworkDevtoolsActive: boolean;
  // Beast Mode: Next-Gen Features
  isContainerQueryInspectorActive: boolean;
  isViewTransitionsDebuggerActive: boolean;
  isScrollAnimationsDebuggerActive: boolean;
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

// ============================================
// Popup Tab Types
// ============================================

/** Popup tab ID */
export type PopupTabId = 'tools' | 'performance' | 'inspector' | 'settings';

/** Popup tab configuration */
export interface PopupTabConfig {
  id: PopupTabId;
  label: string;
  icon: string;
  badge?: number;
}

// ============================================
// Favorites/Quick Access Types
// ============================================

/** User favorites storage */
export interface UserFavorites {
  pinnedTools: ToolId[];
  recentTools: Array<{ toolId: ToolId; timestamp: number }>;
}
