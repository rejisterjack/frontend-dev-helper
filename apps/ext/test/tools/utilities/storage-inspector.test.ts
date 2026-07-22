import { describe, beforeEach, vi, it, expect } from 'vitest';
import { storageInspector } from '@/tools/utilities/storage-inspector';
import { runStandardToolTests } from '../../helpers';

describe('storageInspector', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(storageInspector, {
    id: 'storage-inspector',
    name: 'Storage Inspector',
    category: 'utility',
    icon: 'Database',
  }, {
    showLocalStorage: true,
    showSessionStorage: true,
    showCookies: true,
    showIndexedDB: false,
    searchQuery: '',
  });

  it('should have storage-specific config options', () => {
    const schema = storageInspector.configSchema;
    expect(schema.showLocalStorage).toBeDefined();
    expect(schema.showSessionStorage).toBeDefined();
    expect(schema.showCookies).toBeDefined();
    expect(schema.showIndexedDB).toBeDefined();
    expect(schema.searchQuery).toBeDefined();
  });
});
