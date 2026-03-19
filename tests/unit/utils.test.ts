/**
 * Utility Functions Tests
 */

import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatBytes,
  formatDuration,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  truncate,
  parseCssValue,
  rgbToHex,
  parseColor,
  escapeRegExp,
  hashString,
  sleep,
} from '@/utils';

describe('formatNumber', () => {
  it('formats numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('respects decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 2)).toBe('1.50 KB');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.50s');
  });

  it('formats minutes', () => {
    expect(formatDuration(90000)).toBe('1.50m');
  });
});

describe('debounce', () => {
  it('delays function execution', async () => {
    let called = false;
    const fn = () => {
      called = true;
    };
    const debounced = debounce(fn, 100);

    debounced();
    expect(called).toBe(false);

    await sleep(150);
    expect(called).toBe(true);
  });

  it('only executes once for multiple calls', async () => {
    let count = 0;
    const fn = () => {
      count++;
    };
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    await sleep(150);
    expect(count).toBe(1);
  });
});

describe('throttle', () => {
  it('limits function execution', async () => {
    let count = 0;
    const fn = () => {
      count++;
    };
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();

    expect(count).toBe(1);

    await sleep(150);
    throttled();
    expect(count).toBe(2);
  });
});

describe('deepClone', () => {
  it('clones primitive values', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('string')).toBe('string');
    expect(deepClone(null)).toBe(null);
  });

  it('clones objects', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);
    
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('clones arrays', () => {
    const arr = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(arr);
    
    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
  });
});

describe('isEmpty', () => {
  it('returns true for null and undefined', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it('returns true for empty strings', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
  });

  it('returns true for empty arrays', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('returns true for empty objects', () => {
    expect(isEmpty({})).toBe(true);
  });

  it('returns false for non-empty values', () => {
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
    expect(isEmpty(0)).toBe(false);
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('does not truncate short strings', () => {
    expect(truncate('hi', 10)).toBe('hi');
  });
});

describe('parseCssValue', () => {
  it('parses numeric values from CSS', () => {
    expect(parseCssValue('100px')).toBe(100);
    expect(parseCssValue('1.5em')).toBe(1.5);
    expect(parseCssValue('auto')).toBe(0);
  });
});

describe('rgbToHex', () => {
  it('converts RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });

  it('pads values correctly', () => {
    expect(rgbToHex(0, 15, 255)).toBe('#000fff');
  });
});

describe('parseColor', () => {
  it('parses hex colors', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('parses rgb colors', () => {
    expect(parseColor('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0 });
    expect(parseColor('rgba(255, 128, 0, 0.5)')).toEqual({ r: 255, g: 128, b: 0 });
  });

  it('returns null for invalid colors', () => {
    expect(parseColor('invalid')).toBeNull();
  });
});

describe('escapeRegExp', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegExp('a.b*c+d?e[f]g(h)i{j}k^l$m|n\\o')).toBe(
      'a\\.b\\*c\\+d\\?e\\[f\\]g\\(h\\)i\\{j\\}k\\^l\\$m\\|n\\\\o'
    );
  });
});

describe('hashString', () => {
  it('returns consistent hashes for same strings', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });

  it('returns different hashes for different strings', () => {
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('returns non-negative values', () => {
    expect(hashString('any string')).toBeGreaterThanOrEqual(0);
  });
});

describe('sleep', () => {
  it('waits for specified duration', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });
});
