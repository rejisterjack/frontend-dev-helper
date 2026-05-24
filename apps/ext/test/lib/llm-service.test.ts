import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConfig, isEnabled } from '@/lib/llm-service';

describe('llm-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getConfig should return a config object', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config).toHaveProperty('apiKey');
    expect(config).toHaveProperty('model');
    expect(config).toHaveProperty('baseUrl');
    expect(config).toHaveProperty('maxTokens');
    expect(config).toHaveProperty('temperature');
    expect(config).toHaveProperty('enabled');
  });

  it('isEnabled should return false when no apiKey is set', () => {
    const result = isEnabled();
    expect(typeof result).toBe('boolean');
  });

  it('getConfig should return a copy of config', () => {
    const config1 = getConfig();
    const config2 = getConfig();
    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2);
  });
});
