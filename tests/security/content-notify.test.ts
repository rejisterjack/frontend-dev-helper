import { afterEach, describe, expect, it } from 'vitest';
import { showContentErrorToast } from '../../src/utils/content-notify';

describe('content-notify security', () => {
  afterEach(() => {
    document.getElementById('fdh-content-toast')?.remove();
  });

  it('uses textContent only so HTML cannot inject markup', () => {
    showContentErrorToast('<img src=x onerror=alert(1)>');
    const el = document.getElementById('fdh-content-toast');
    expect(el).toBeTruthy();
    expect(el?.innerHTML).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(el?.querySelector('img')).toBeNull();
  });
});
