import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ============================================
// Chrome API Mock
// ============================================

// In-memory storage for tests
const mockStorageData: Record<string, unknown> = {};

const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onInstalled: {
      addListener: vi.fn(),
    },
    getManifest: vi.fn(() => ({
      manifest_version: 3,
      name: 'FrontendDevHelper',
      version: '1.0.0',
    })),
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
    lastError: null,
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    sendMessage: vi.fn(),
    captureVisibleTab: vi.fn((options, callback) => {
      // Mock successful screenshot capture
      if (callback) {
        callback('data:image/png;base64,mock-screenshot');
      }
    }),
    onActivated: {
      addListener: vi.fn(),
    },
    onUpdated: {
      addListener: vi.fn(),
    },
  },
  storage: {
    sync: {
      get: vi.fn((keys?: string | string[] | Record<string, unknown>) => {
        if (keys === null || keys === undefined) {
          return Promise.resolve({ ...mockStorageData });
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorageData[keys] });
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in mockStorageData) {
              result[key] = mockStorageData[key];
            }
          }
          return Promise.resolve(result);
        }
        return Promise.resolve({ ...keys, ...mockStorageData });
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        if (typeof keys === 'string') {
          delete mockStorageData[keys];
        } else {
          for (const key of keys) {
            delete mockStorageData[key];
          }
        }
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
        return Promise.resolve();
      }),
    },
    local: {
      get: vi.fn((keys?: string | string[] | Record<string, unknown>) => {
        if (keys === null || keys === undefined) {
          return Promise.resolve({ ...mockStorageData });
        }
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorageData[keys] });
        }
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in mockStorageData) {
              result[key] = mockStorageData[key];
            }
          }
          return Promise.resolve(result);
        }
        return Promise.resolve({ ...keys, ...mockStorageData });
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(mockStorageData, items);
        return Promise.resolve();
      }),
      remove: vi.fn((keys: string | string[]) => {
        if (typeof keys === 'string') {
          delete mockStorageData[keys];
        } else {
          for (const key of keys) {
            delete mockStorageData[key];
          }
        }
        return Promise.resolve();
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
        return Promise.resolve();
      }),
    },
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(),
    onClicked: {
      addListener: vi.fn(),
    },
  },
  commands: {
    onCommand: {
      addListener: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn(),
  },
  notifications: {
    create: vi.fn(),
  },
};

// @ts-expect-error - Mocking chrome global
global.chrome = mockChrome;

// ============================================
// Browser API Mocks
// ============================================

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Image
global.Image = class MockImage {
  src = '';
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor() {
    // Simulate async image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
} as unknown as typeof Image;

// Note: Don't mock document.createElement globally as it breaks jsdom for React tests
// Export manager tests have their own DOM mocks

// ============================================
// Console Mocking (optional)
// ============================================

// Suppress console warnings during tests if needed
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

// ============================================
// Cleanup
// ============================================

afterEach(() => {
  vi.clearAllMocks();
  // Clear mock storage
  Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
});
