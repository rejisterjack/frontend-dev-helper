import { describe, beforeEach, vi, it, expect } from 'vitest';
import { commandPalette } from '@/tools/utilities/command-palette';
import { runStandardToolTests, createMockCtx } from '../../helpers';

describe('commandPalette', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(commandPalette, {
    id: 'command-palette',
    name: 'Command Palette',
    category: 'utility',
    icon: 'Terminal',
  }, {
    shortcut: 'Ctrl+Shift+P',
    showRecent: true,
    maxRecent: 5,
    fuzzySearch: true,
  });

  it('should have fuzzy search option', () => {
    const schema = commandPalette.configSchema;
    expect(schema.fuzzySearch).toBeDefined();
    expect(schema.fuzzySearch.type).toBe('boolean');
    expect(schema.fuzzySearch.default).toBe(true);
  });
});
