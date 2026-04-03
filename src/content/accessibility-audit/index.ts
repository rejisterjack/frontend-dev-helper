/**
 * Accessibility Audit Tool
 *
 * Comprehensive accessibility checker providing:
 * - ARIA validation
 * - Focus order visualization
 * - Color contrast analysis
 * - Missing alt text detection
 * - Form label validation
 * - Keyboard navigation testing
 * - Heading structure validation
 * - Landmark region validation
 *
 * @example
 * ```typescript
 * import { accessibilityAudit } from '@/content/accessibility-audit';
 *
 * // Enable the audit
 * accessibilityAudit.enable();
 *
 * // Toggle on/off
 * accessibilityAudit.toggle();
 *
 * // Get current state
 * const state = accessibilityAudit.getState();
 *
 * // Run audit and get report
 * const report = accessibilityAudit.runAudit();
 *
 * // Cleanup
 * accessibilityAudit.destroy();
 * ```
 */

// ============================================
// Re-export types
// ============================================

export type {
  AccessibilityAuditState,
  AccessibilityReport,
  AltTextIssue,
  ARIAIssue,
  ContrastIssue,
  FocusOrderItem,
  FormLabelIssue,
  HeadingIssue,
  IssueHighlightInfo,
  IssueSeverity,
  KeyboardNavIssue,
  LandmarkIssue,
} from './types';

// ============================================
// Re-export constants
// ============================================

export {
  COLORS,
  FOCUSABLE_SELECTOR,
  INTERACTIVE_ELEMENTS,
  LANDMARK_ELEMENTS,
  LANDMARK_ROLES,
  TEXT_CONTRAST_SELECTOR,
  VALID_ARIA_ROLES,
  VALID_ARIA_STATES,
  Z_INDEX,
} from './constants';

// ============================================
// Re-export audit functions
// ============================================

export { validateARIA } from './audits/aria';
export { analyzeContrast } from './audits/contrast';
export { validateFormLabels } from './audits/forms';
export { validateHeadings } from './audits/headings';
export { detectMissingAltText } from './audits/images';
export { testKeyboardNav } from './audits/keyboard';
export { validateLandmarks } from './audits/landmarks';

// ============================================
// Re-export report functions
// ============================================

export {
  buildReportContent,
  generateMarkdownReport,
  generateTextReport,
  setReportState,
} from './report';

// ============================================
// Re-export core functionality
// ============================================

export {
  accessibilityAudit,
  destroy,
  disable,
  enable,
  getState,
  runAudit,
  toggle,
} from './core';

// ============================================
// Default export
// ============================================

export { accessibilityAudit as default } from './core';
