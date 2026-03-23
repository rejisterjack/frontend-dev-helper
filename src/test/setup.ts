import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ============================================
// Chrome API Mock
// ============================================

// In-memory storage for tests
const mockStorageData: Record<string, unknown> = {};

const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
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
    captureVisibleTab: vi.fn((_options, callback) => {
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
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(() => false),
    },
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
        Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
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
        Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
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

// Mock chrome global for tests
(global as unknown as { chrome: typeof mockChrome }).chrome = mockChrome;

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

// ============================================
// Canvas API Mock
// ============================================

// jsdom does not implement the Canvas 2D rendering context.
// We provide a minimal mock so canvas-dependent tests can run.
const createMockContext = (): CanvasRenderingContext2D => {
  const imageDataStore = new Map<string, Uint8ClampedArray>();
  let fillStyle = '#000000';

  const ctx = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    canvas: null as unknown as HTMLCanvasElement,
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      // Store fill color for getImageData to read back
      const key = `${x},${y},${w},${h}`;
      const color = fillStyle;
      const hexToRgba = (hex: string): [number, number, number, number] => {
        const cleaned = hex.replace('#', '');
        if (cleaned.length === 3) {
          return [
            parseInt(cleaned[0] + cleaned[0], 16),
            parseInt(cleaned[1] + cleaned[1], 16),
            parseInt(cleaned[2] + cleaned[2], 16),
            255,
          ];
        }
        return [
          parseInt(cleaned.slice(0, 2), 16),
          parseInt(cleaned.slice(2, 4), 16),
          parseInt(cleaned.slice(4, 6), 16),
          255,
        ];
      };
      const rgba = hexToRgba(color);
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < w * h; i++) {
        data[i * 4] = rgba[0];
        data[i * 4 + 1] = rgba[1];
        data[i * 4 + 2] = rgba[2];
        data[i * 4 + 3] = rgba[3];
      }
      imageDataStore.set(key, data);
    }),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    putImageData: vi.fn(),
    getImageData: vi.fn((x: number, y: number, w: number, h: number): ImageData => {
      // Look for stored fill data, return it or return zeros
      for (const [key, data] of imageDataStore.entries()) {
        const [kx, ky, kw, kh] = key.split(',').map(Number);
        if (x >= kx && y >= ky && x < kx + kw && y < ky + kh) {
          const slice = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < w * h; i++) {
            const srcIdx = ((y - ky) * kw + (x - kx)) * 4;
            slice[i * 4] = data[srcIdx];
            slice[i * 4 + 1] = data[srcIdx + 1];
            slice[i * 4 + 2] = data[srcIdx + 2];
            slice[i * 4 + 3] = data[srcIdx + 3];
          }
          return { data: slice, width: w, height: h, colorSpace: 'srgb' } as ImageData;
        }
      }
      return {
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
        colorSpace: 'srgb',
      } as ImageData;
    }),
    createImageData: vi.fn(
      (w: number, h: number): ImageData =>
        ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
          colorSpace: 'srgb',
        }) as ImageData
    ),
    measureText: vi.fn(
      () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }) as TextMetrics
    ),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    clip: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  } as unknown as CanvasRenderingContext2D;

  // Make fillStyle update the tracked local var
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => fillStyle,
    set: (v: string) => {
      fillStyle = v;
    },
  });

  return ctx;
};

// Patch HTMLCanvasElement.prototype.toDataURL (jsdom returns null)
HTMLCanvasElement.prototype.toDataURL = (type = 'image/png') => `data:${type};base64,mock`;

// Patch HTMLCanvasElement.prototype.getContext to return our mock
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (contextType: string, ...args: unknown[]) {
  if (contextType === '2d') {
    const ctx = createMockContext();
    Object.defineProperty(ctx, 'canvas', { value: this, writable: false });
    return ctx as unknown as RenderingContext;
  }
  return (originalGetContext as (type: string, ...a: unknown[]) => RenderingContext | null).call(
    this,
    contextType,
    ...args
  );
} as typeof HTMLCanvasElement.prototype.getContext;

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
  Object.keys(mockStorageData).forEach((key) => delete mockStorageData[key]);
});
