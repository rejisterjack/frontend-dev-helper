export type ToolId =
  | 'dom-outliner'
  | 'spacing-visualizer'
  | 'font-inspector'
  | 'color-picker'
  | 'pixel-ruler'
  | 'css-inspector'
  | 'css-editor'
  | 'contrast-checker'
  | 'layout-visualizer'
  | 'z-index-visualizer'
  | 'tech-detector'
  | 'accessibility-audit'
  | 'network-analyzer'
  | 'screenshot-studio'
  | 'animation-inspector'
  | 'responsive-preview'
  | 'design-system-validator'
  | 'command-palette'
  | 'storage-inspector'
  | 'focus-debugger'
  | 'form-debugger'
  | 'component-tree'
  | 'flame-graph'
  | 'visual-regression'
  | 'smart-suggestions'
  | 'element-inspector'
  | 'grid-overlay'
  | 'css-scanner'
  | 'css-variable-inspector'
  | 'smart-element-picker'
  | 'performance-budget'
  | 'framework-devtools'
  | 'container-query-inspector'
  | 'view-transitions-debugger'
  | 'scroll-animations-debugger'
  | 'breakpoint-overlay'
  | 'ai-analyzer'
  | 'component-analyzer'
  | 'focus-debugger-a11y'
  | 'site-report-generator'
  | 'ai-auto-fix'
  | 'full-audit'
  | 'design-token-extractor'
  | 'source-map-viewer'
  | 'network-replay'
  | 'react-state-panel'
  | 'vue-state-panel'
  | 'session-replay';

export type ToolCategory =
  | 'inspection'
  | 'css'
  | 'performance'
  | 'accessibility'
  | 'ai'
  | 'utility';

export type ToolActivationState = 'active' | 'inactive' | 'loading' | 'error';

export interface ToolState {
  id: ToolId;
  active: boolean;
  activationState: ToolActivationState;
  error?: string;
  lastActivated?: number;
  lastDeactivated?: number;
}

export interface ToolsState {
  tools: Record<ToolId, ToolState>;
  activeTools: ToolId[];
}

export interface ContentScriptState {
  tabId: number;
  url: string;
  activeTools: ToolId[];
  initialized: boolean;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect;
  innerText?: string;
  innerHTML?: string;
  outerHTML?: string;
  xpath: string;
  selector: string;
  parentElement?: ElementInfo;
  children?: ElementInfo[];
}

export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  interactionToNextPaint: number;
  timeToFirstByte: number;
  domSize: number;
  scriptCount: number;
  stylesheetCount: number;
  imageSize: number;
  totalTransferSize: number;
  javascriptSize: number;
  cssSize: number;
  fontCount: number;
  requestCount: number;
}

export interface WebVitals {
  lcp: number;
  fid: number;
  cls: number;
  ttfb: number;
  inp: number;
  fcp: number;
  lcpRating: 'good' | 'needs-improvement' | 'poor';
  fidRating: 'good' | 'needs-improvement' | 'poor';
  clsRating: 'good' | 'needs-improvement' | 'poor';
  ttfbRating: 'good' | 'needs-improvement' | 'poor';
  inpRating: 'good' | 'needs-improvement' | 'poor';
  fcpRating: 'good' | 'needs-improvement' | 'poor';
}

export interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  warnings: AccessibilityWarning[];
  passes: number;
  violations: number;
  incomplete: number;
  inapplicable: number;
  timestamp: number;
  url: string;
}

export interface AccessibilityIssue {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
}

export interface AccessibilityNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface AccessibilityWarning {
  id: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  helpUrl: string;
}

export interface ContrastIssue {
  element: string;
  selector: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  fontSize: number;
  fontWeight: number;
  isLargeText: boolean;
}

export interface ARIAIssue {
  element: string;
  selector: string;
  issue: string;
  attribute: string;
  value: string;
  suggestion: string;
}

export interface FocusOrderItem {
  element: string;
  selector: string;
  tabIndex: number;
  order: number;
  isKeyboardFocusable: boolean;
}

export interface AltTextIssue {
  element: string;
  selector: string;
  src?: string;
  alt: string | null;
  issue: string;
  role?: string;
}

export interface FormLabelIssue {
  element: string;
  selector: string;
  inputType: string;
  hasLabel: boolean;
  hasAriaLabel: boolean;
  hasTitle: boolean;
  issue: string;
}

export interface SiteReport {
  url: string;
  timestamp: number;
  performance: PerformanceReportData;
  accessibility: AccessibilityReport;
  seo: SEOReportData;
  bestPractices: BestPracticesReport;
  colorReport: ColorReportData;
  overallScore: number;
}

export interface PerformanceReportData {
  score: number;
  metrics: PerformanceMetrics;
  webVitals: WebVitals;
  opportunities: PerformanceOpportunity[];
  diagnostics: PerformanceDiagnostic[];
}

export interface PerformanceOpportunity {
  id: string;
  title: string;
  description: string;
  savings: number;
  details: Record<string, unknown>;
}

export interface PerformanceDiagnostic {
  id: string;
  title: string;
  description: string;
  value: number;
  details: Record<string, unknown>;
}

export interface ColorReportData {
  score: number;
  contrastIssues: ContrastIssue[];
  colorPalette: ColorPaletteEntry[];
  uniqueColors: number;
  uniqueColorPairs: number;
  passingPairs: number;
  failingPairs: number;
}

export interface ColorPaletteEntry {
  color: string;
  usageCount: number;
  usage: string[];
}

export interface SEOReportData {
  score: number;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  viewport: string;
  charset: string;
  ogTags: Record<string, string>;
  twitterCards: Record<string, string>;
  headings: HeadingEntry[];
  images: SEOImageEntry[];
  links: SEOLinkEntry[];
  structuredData: StructuredDataEntry[];
  issues: SEOIssue[];
}

export interface HeadingEntry {
  level: number;
  text: string;
  order: number;
}

export interface SEOImageEntry {
  src: string;
  alt: string | null;
  width?: number;
  height?: number;
  hasAlt: boolean;
}

export interface SEOLinkEntry {
  href: string;
  text: string;
  isExternal: boolean;
  hasNofollow: boolean;
  hasSponsored: boolean;
  hasUgc: boolean;
}

export interface StructuredDataEntry {
  type: string;
  json: string;
  isValid: boolean;
}

export interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

export interface BestPracticesReport {
  score: number;
  https: boolean;
  http2: boolean;
  passiveListeners: boolean;
  noConsoleErrors: boolean;
  noDeprecatedApis: boolean;
  noDocumentWrite: boolean;
  geolocationOnStart: boolean;
  noVulnerabilities: boolean;
  issues: BestPracticeIssue[];
}

export interface BestPracticeIssue {
  id: string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'solid' | 'unknown';

export interface ComponentNode {
  id: string;
  name: string;
  type: 'element' | 'component' | 'text';
  framework: FrameworkType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  children: ComponentNode[];
  depth: number;
  element?: HTMLElement;
}

export interface ComponentTreeState {
  rootNodes: ComponentNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  framework: FrameworkType;
  isDetecting: boolean;
}

export interface FlameGraphEntry {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  selfTime: number;
  children: FlameGraphEntry[];
  type: 'script' | 'layout' | 'paint' | 'render' | 'idle' | 'other';
  stackDepth: number;
}

export interface PerformanceProfile {
  entries: FlameGraphEntry[];
  startTime: number;
  endTime: number;
  totalDuration: number;
  frames: number;
  droppedFrames: number;
  timestamp: number;
}

export interface FocusableElement {
  element: string;
  selector: string;
  tabIndex: number;
  displayOrder: number;
  domOrder: number;
  isCurrentlyFocused: boolean;
  isVisible: boolean;
  rect: DOMRect;
}

export interface FocusHistoryEntry {
  element: string;
  selector: string;
  timestamp: number;
  type: 'focus' | 'blur';
}

export interface FocusDebuggerState {
  focusableElements: FocusableElement[];
  focusHistory: FocusHistoryEntry[];
  currentFocusIndex: number;
  isTrapping: boolean;
  showOverlay: boolean;
}

export interface FormField {
  element: string;
  selector: string;
  type: string;
  name: string;
  value: string;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  valid: boolean;
  validationMessage: string;
  hasLabel: boolean;
  label: string | null;
  hasPlaceholder: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: string;
  max?: string;
}

export interface FormInfo {
  id: string;
  action: string;
  method: string;
  fields: FormField[];
  isValid: boolean;
  errors: FormValidationError[];
}

export interface FormValidationError {
  field: string;
  selector: string;
  message: string;
  type: 'required' | 'pattern' | 'custom' | 'type' | 'range';
}

export interface FormDebuggerState {
  forms: FormInfo[];
  selectedFormId: string | null;
  showValidation: boolean;
  showLabels: boolean;
}

export interface BaselineScreenshot {
  id: string;
  name: string;
  url: string;
  viewport: { width: number; height: number };
  imageData: string;
  timestamp: number;
}

export interface DiffResult {
  baselineId: string;
  comparisonId: string;
  diffPercentage: number;
  diffImageData: string;
  passed: boolean;
  threshold: number;
  timestamp: number;
}

export interface VisualRegressionTest {
  id: string;
  name: string;
  baseline: BaselineScreenshot;
  comparison?: BaselineScreenshot;
  diff?: DiffResult;
  status: 'pending' | 'passed' | 'failed' | 'error';
  threshold: number;
}

export interface VisualRegressionState {
  tests: VisualRegressionTest[];
  baselines: BaselineScreenshot[];
  selectedTestId: string | null;
  threshold: number;
  isCapturing: boolean;
}

export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  showTooltips: boolean;
  autoActivate: boolean;
  overlayOpacity: number;
  highlightColor: string;
  persistState: boolean;
  devToolsIntegration: boolean;
  keyboardShortcuts: boolean;
  compactMode: boolean;
  notifications: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

export interface FeatureToggles {
  aiAssistant: boolean;
  visualRegression: boolean;
  componentTree: boolean;
  flameGraph: boolean;
  performanceBudget: boolean;
  frameworkDevtools: boolean;
  containerQueryInspector: boolean;
  viewTransitionsDebugger: boolean;
  scrollAnimationsDebugger: boolean;
  experimentalFeatures: boolean;
}

export interface ToggleToolPayload {
  toolId: ToolId;
  activate: boolean;
}

export interface ToolStateChangeEvent {
  toolId: ToolId;
  active: boolean;
  activationState: ToolActivationState;
  error?: string;
}

export interface SetToolStatePayload {
  toolId: ToolId;
  state: ToolState;
}

export interface GetToolStatePayload {
  toolId: ToolId;
}

export interface UpdateSettingsPayload {
  settings: Partial<ExtensionSettings>;
}

export interface ElementSelectedPayload {
  element: ElementInfo;
  toolId: ToolId;
}

export interface PerformanceDataPayload {
  metrics: PerformanceMetrics;
  webVitals: WebVitals;
}

export interface AccessibilityDataPayload {
  report: AccessibilityReport;
}

export type ExtensionMessage =
  | { type: 'TOGGLE_TOOL'; payload: ToggleToolPayload }
  | { type: 'TOOL_STATE_CHANGED'; payload: ToolStateChangeEvent }
  | { type: 'SET_TOOL_STATE'; payload: SetToolStatePayload }
  | { type: 'GET_TOOL_STATE'; payload: GetToolStatePayload }
  | { type: 'DEACTIVATE_ALL_TOOLS' }
  | { type: 'UPDATE_SETTINGS'; payload: UpdateSettingsPayload }
  | { type: 'GET_SETTINGS' }
  | { type: 'SETTINGS_UPDATED'; payload: ExtensionSettings }
  | { type: 'ELEMENT_SELECTED'; payload: ElementSelectedPayload }
  | { type: 'PERFORMANCE_DATA'; payload: PerformanceDataPayload }
  | { type: 'ACCESSIBILITY_DATA'; payload: AccessibilityDataPayload }
  | { type: 'SITE_REPORT_DATA'; payload: SiteReport }
  | { type: 'COLOR_REPORT_DATA'; payload: ColorReportData }
  | { type: 'SEO_REPORT_DATA'; payload: SEOReportData }
  | { type: 'CONTENT_SCRIPT_READY' }
  | { type: 'POPUP_OPENED' }
  | { type: 'POPUP_CLOSED' }
  | { type: 'EXECUTE_COMMAND'; payload: Command }
  | { type: 'COMMAND_RESULT'; payload: { commandId: string; result: unknown } }
  | { type: 'LLM_QUERY'; payload: { query: string; context?: LLMPageContext } }
  | { type: 'LLM_RESPONSE'; payload: { response: string } }
  | { type: 'LLM_ERROR'; payload: { error: string } }
  | { type: 'VISUAL_REGRESSION_CAPTURE'; payload: { name: string; threshold: number } }
  | { type: 'VISUAL_REGRESSION_COMPARE'; payload: { baselineId: string; threshold: number } }
  | { type: 'VISUAL_REGRESSION_RESULT'; payload: VisualRegressionTest }
  | { type: 'CONTEXT_MENU_CLICKED'; payload: ContextMenuConfig }
  | { type: 'KEYBOARD_SHORTCUT'; payload: { shortcut: string } }
  | { type: 'INIT_CONTENT_SCRIPT' }
  | { type: 'DESTROY_CONTENT_SCRIPT' };

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Command {
  id: string;
  name: string;
  description: string;
  shortcut?: string;
  toolId?: ToolId;
  action?: () => void;
  category: ToolCategory;
}

export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  commands: Command[];
  selectedIndex: number;
  recentCommands: Command[];
}

export interface ContextMenuConfig {
  id: string;
  title: string;
  contexts: chrome.contextMenus.ContextType[];
  toolId?: ToolId;
  action?: string;
}

export interface LLMConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
  enabled: boolean;
  provider: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface LLMPageContext {
  url: string;
  title: string;
  selectedElement?: ElementInfo;
  activeTools: ToolId[];
  performanceMetrics?: PerformanceMetrics;
  accessibilityIssues?: AccessibilityIssue[];
  seoData?: SEOReportData;
  viewport: { width: number; height: number };
  framework?: FrameworkType;
}

export type ChatMessageRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    duration?: number;
    pageContext?: LLMPageContext;
  };
}

export type SubscriptionTier = 'free' | 'pro' | 'team';

export type FeatureFlag =
  | 'source-map-resolution'
  | 'vscode-bridge'
  | 'element-inspector'
  | 'css-inspector'
  | 'dom-outliner'
  | 'tech-detector'
  | 'color-picker'
  | 'contrast-checker'
  | 'accessibility-audit'
  | 'ollama-provider'
  | 'github-pr-comments'
  | 'ai-tools'
  | 'ai-auto-fix'
  | 'smart-suggestions'
  | 'component-analyzer'
  | 'specificity-cascade'
  | 'css-editor'
  | 'css-scanner'
  | 'css-variable-inspector'
  | 'layout-visualizer'
  | 'framework-panels'
  | 'react-state-panel'
  | 'vue-state-panel'
  | 'react-render-tracker'
  | 'performance-audit'
  | 'flame-graph'
  | 'network-analyzer'
  | 'network-replay'
  | 'session-replay'
  | 'visual-regression'
  | 'screenshot-studio'
  | 'site-report-generator'
  | 'full-audit';
