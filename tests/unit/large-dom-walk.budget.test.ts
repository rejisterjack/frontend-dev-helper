/**
 * Ensures full-document walks stay within a loose time budget on ~10k nodes (CI-safe).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  estimateElementCount,
  walkElementsEfficiently,
} from '../../src/utils/dom-performance';

describe('large DOM walk budget', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('walkElementsEfficiently completes within budget and samples on huge trees', () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 10_000; i++) {
      const d = document.createElement('div');
      d.textContent = String(i);
      frag.appendChild(d);
    }
    document.body.appendChild(frag);

    expect(estimateElementCount(document.body)).toBeGreaterThanOrEqual(10_000);

    const t0 = performance.now();
    let visits = 0;
    walkElementsEfficiently(document.body, () => {
      visits++;
    });
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(8000);
    expect(visits).toBeGreaterThan(500);
    expect(visits).toBeLessThan(10_001);
  });
});
