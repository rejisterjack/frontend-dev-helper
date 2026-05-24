import { describe, beforeEach, vi, it, expect } from 'vitest';
import { cssEditor } from '@/tools/css/css-editor';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('cssEditor', () => {
  beforeEach(() => {
    document.body.textContent = '';
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    vi.clearAllMocks();
  });

  runStandardToolTests(cssEditor, {
    id: 'css-editor',
    name: 'CSS Editor',
    category: 'css',
    icon: 'PenTool',
  }, {
    autoApply: true,
    showDiff: true,
    persistChanges: false,
    editorTheme: 'dark',
  });

  it('should be categorized as css', () => {
    expect(cssEditor.category).toBe('css');
  });
});
