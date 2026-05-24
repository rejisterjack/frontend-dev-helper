import { describe, beforeEach, vi, it, expect } from 'vitest';
import { formDebugger } from '@/tools/inspection/form-debugger';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('formDebugger', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'test';
    form.appendChild(input);
    document.body.appendChild(form);
    vi.clearAllMocks();
  });

  runStandardToolTests(formDebugger, {
    id: 'form-debugger',
    name: 'Form Debugger',
    category: 'inspection',
    icon: 'FileInput',
  }, {
    showValidation: true,
    showConstraints: true,
    showLabels: true,
    showDefaultValues: false,
    highlightRequired: true,
  });

  it('should be categorized as inspection', () => {
    expect(formDebugger.category).toBe('inspection');
  });
});
