/**
 * TypeScript Interfaces for Accessibility Audit
 */

/** Issue severity level */
export type IssueSeverity = 'error' | 'warning' | 'info';

/** ARIA issue details */
export interface ARIAIssue {
  element: string;
  attribute?: string;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Focus order item */
export interface FocusOrderItem {
  index: number;
  element: string;
  selector: string;
  tabIndex: number;
  visible: boolean;
}

/** Color contrast issue */
export interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  severity: IssueSeverity;
  selector: string;
}

/** Missing alt text issue */
export interface AltTextIssue {
  src: string;
  element: string;
  severity: IssueSeverity;
  selector: string;
}

/** Form label issue */
export interface FormLabelIssue {
  inputType: string;
  inputId?: string;
  inputName?: string;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Keyboard navigation issue */
export interface KeyboardNavIssue {
  element: string;
  issue: string;
  severity: IssueSeverity;
  selector: string;
}

/** Heading structure issue */
export interface HeadingIssue {
  element: string;
  level: number;
  previousLevel: number;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Landmark region issue */
export interface LandmarkIssue {
  element: string;
  role?: string;
  message: string;
  severity: IssueSeverity;
  selector: string;
}

/** Complete accessibility report */
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
  keyboardNav: {
    issues: KeyboardNavIssue[];
    count: number;
  };
  headings?: {
    issues: HeadingIssue[];
    count: number;
  };
  landmarks?: {
    issues: LandmarkIssue[];
    count: number;
  };
}

/** Current state of the accessibility audit */
export interface AccessibilityAuditState {
  enabled: boolean;
  showFocusOrder: boolean;
  highlightIssues: boolean;
  lastReport: AccessibilityReport | null;
}

/** Issue highlight info for UI */
export interface IssueHighlightInfo {
  selector: string;
  severity: IssueSeverity;
  msg: string;
}
