import { describe, beforeEach, vi, it, expect } from 'vitest';
import { accessibilityAudit } from '@/tools/accessibility/accessibility-audit';
import { runStandardToolTests } from '../../helpers';

describe('accessibilityAudit', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(accessibilityAudit, {
    id: 'accessibility-audit',
    name: 'Accessibility Audit',
    category: 'accessibility',
    icon: 'ShieldCheck',
  }, {
    level: 'aa',
    checkImages: true,
    checkForms: true,
    checkHeadings: true,
    checkLinks: true,
    checkAria: true,
    checkColor: true,
  });

  it('should be categorized as accessibility', () => {
    expect(accessibilityAudit.category).toBe('accessibility');
  });
});
