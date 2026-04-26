import { accessibilityAudit } from '../accessibility-audit';
import { createToolHandlers } from './shared';

export const accessibilityAuditHandlers = {
  ...createToolHandlers('ACCESSIBILITY_AUDIT', accessibilityAudit, 'isAccessibilityAuditActive'),
  ACCESSIBILITY_AUDIT_RUN: (_payload, _state, sendResponse) => {
    const report = accessibilityAudit.runAudit();
    sendResponse({ success: true, report });
  },
};
