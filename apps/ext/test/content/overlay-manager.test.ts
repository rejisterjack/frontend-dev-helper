import { describe, it, expect, vi, beforeEach } from 'vitest';

// We are testing the mocked overlay-manager, so we import it
// The actual module is mocked in setup.ts
import {
  getOverlayContainer,
  addOverlayElement,
  removeOverlayElement,
  clearAllOverlays,
  createHighlightBox,
  destroyOverlayContainer,
} from '@/content/overlay-manager';

describe('overlay-manager (mocked)', () => {
  beforeEach(() => {
    destroyOverlayContainer();
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  it('should create an overlay container', () => {
    const result = getOverlayContainer();
    expect(result.container).toBeDefined();
    expect(result.shadow).toBeDefined();
  });

  it('should add overlay element without error', () => {
    const el = document.createElement('div');
    el.textContent = 'Test overlay';
    expect(() => addOverlayElement(el)).not.toThrow();
  });

  it('should remove overlay element without error', () => {
    const el = document.createElement('div');
    el.textContent = 'Test overlay';
    addOverlayElement(el);
    expect(() => removeOverlayElement(el)).not.toThrow();
  });

  it('should create a highlight box with correct styles', () => {
    const rect = new DOMRect(10, 20, 100, 50);
    const box = createHighlightBox(rect, '#ff0000');
    expect(box).toBeDefined();
    expect(box.style.position).toBe('fixed');
    expect(box.style.top).toBe('20px');
    expect(box.style.left).toBe('10px');
    expect(box.style.width).toBe('100px');
    expect(box.style.height).toBe('50px');
  });

  it('should create a highlight box with label', () => {
    const rect = new DOMRect(0, 0, 100, 50);
    const box = createHighlightBox(rect, '#3b82f6', 'Test Label');
    const label = box.querySelector('div');
    expect(label).toBeDefined();
    expect(label!.textContent).toBe('Test Label');
  });

  it('should destroy overlay container without error', () => {
    getOverlayContainer();
    expect(() => destroyOverlayContainer()).not.toThrow();
  });

  it('should clear all overlays without error', () => {
    expect(() => clearAllOverlays()).not.toThrow();
  });
});
