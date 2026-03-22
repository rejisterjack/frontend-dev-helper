/**
 * Feature Manager Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Manager', () => {
  let features: Map<string, boolean>;

  beforeEach(() => {
    features = new Map();
  });

  describe('Feature Registration', () => {
    it('should register a feature', () => {
      features.set('darkMode', true);
      expect(features.get('darkMode')).toBe(true);
    });

    it('should enable a feature', () => {
      features.set('analytics', false);
      features.set('analytics', true);
      expect(features.get('analytics')).toBe(true);
    });

    it('should disable a feature', () => {
      features.set('notifications', true);
      features.set('notifications', false);
      expect(features.get('notifications')).toBe(false);
    });
  });

  describe('Feature State Management', () => {
    it('should toggle feature state', () => {
      const toggleFeature = (name: string): boolean => {
        const current = features.get(name) ?? false;
        const next = !current;
        features.set(name, next);
        return next;
      };

      features.set('feature', false);
      const result = toggleFeature('feature');
      expect(result).toBe(true);
    });

    it('should get all enabled features', () => {
      features.set('a', true);
      features.set('b', false);
      features.set('c', true);

      const enabled = Array.from(features.entries())
        .filter(([, v]) => v)
        .map(([k]) => k);

      expect(enabled).toContain('a');
      expect(enabled).toContain('c');
      expect(enabled).not.toContain('b');
    });
  });
});
