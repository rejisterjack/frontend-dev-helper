import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DOM_SAMPLING,
  forEachElementChunked,
  shouldSampleDom,
} from '../../src/utils/dom-performance';

describe('dom-performance', () => {
  it('shouldSampleDom reflects threshold', () => {
    expect(shouldSampleDom(100)).toBe(false);
    expect(shouldSampleDom(DEFAULT_DOM_SAMPLING.largeDomThreshold + 1)).toBe(true);
  });

  it('forEachElementChunked visits all nodes synchronously when list fits one chunk', () => {
    const els = [document.createElement('div'), document.createElement('span')];
    const seen: string[] = [];
    forEachElementChunked(els, 10, (el) => seen.push(el.tagName));
    expect(seen).toEqual(['DIV', 'SPAN']);
  });

  it('schedules idle continuation when chunking', async () => {
    const ric = vi.fn((cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    });
    vi.stubGlobal('requestIdleCallback', ric);

    const parent = document.createElement('div');
    for (let i = 0; i < 5; i++) parent.appendChild(document.createElement('span'));
    const els = parent.querySelectorAll('span');
    let count = 0;
    forEachElementChunked(els, 2, () => {
      count++;
    });

    await vi.waitFor(() => {
      expect(count).toBe(5);
    });

    vi.unstubAllGlobals();
  });
});
