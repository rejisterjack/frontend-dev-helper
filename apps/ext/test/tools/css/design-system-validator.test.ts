import { describe, beforeEach, vi, it, expect } from 'vitest';
import { designSystemValidator } from '@/tools/css/design-system-validator';
import { runStandardToolTests } from '../../helpers';

describe('designSystemValidator', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(designSystemValidator, {
    id: 'design-system-validator',
    name: 'Design System Validator',
    category: 'css',
    icon: 'CheckCircle',
  }, {
    checkColors: true,
    checkSpacing: true,
    checkTypography: true,
    checkComponents: true,
  });

  it('should have design system config options', () => {
    const schema = designSystemValidator.configSchema;
    expect(schema.checkColors).toBeDefined();
    expect(schema.checkColors.type).toBe('boolean');
  });
});
