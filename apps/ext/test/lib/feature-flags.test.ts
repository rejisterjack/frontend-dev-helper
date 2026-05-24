import { describe, it, expect } from 'vitest';
import { isFeatureEnabled, getRequiredTier, getAllFeatureFlags } from '@/lib/feature-flags';
import type { SubscriptionTier, FeatureFlag } from '@/lib/types';

describe('feature-flags', () => {
  describe('isFeatureEnabled', () => {
    it('returns true for free features on free tier', () => {
      expect(isFeatureEnabled('source-map-resolution', 'free')).toBe(true);
      expect(isFeatureEnabled('github-pr-comments', 'free')).toBe(true);
      expect(isFeatureEnabled('ollama-provider', 'free')).toBe(true);
    });

    it('returns false for pro features on free tier', () => {
      expect(isFeatureEnabled('framework-panels', 'free')).toBe(false);
      expect(isFeatureEnabled('network-replay', 'free')).toBe(false);
      expect(isFeatureEnabled('session-replay', 'free')).toBe(false);
      expect(isFeatureEnabled('vscode-bridge', 'free')).toBe(false);
    });

    it('returns true for pro features on pro tier', () => {
      expect(isFeatureEnabled('framework-panels', 'pro')).toBe(true);
      expect(isFeatureEnabled('network-replay', 'pro')).toBe(true);
      expect(isFeatureEnabled('session-replay', 'pro')).toBe(true);
      expect(isFeatureEnabled('vscode-bridge', 'pro')).toBe(true);
      // free features also work on pro
      expect(isFeatureEnabled('source-map-resolution', 'pro')).toBe(true);
    });

    it('returns true for pro features on team tier', () => {
      expect(isFeatureEnabled('framework-panels', 'team')).toBe(true);
      expect(isFeatureEnabled('network-replay', 'team')).toBe(true);
      expect(isFeatureEnabled('session-replay', 'team')).toBe(true);
      expect(isFeatureEnabled('vscode-bridge', 'team')).toBe(true);
      expect(isFeatureEnabled('source-map-resolution', 'team')).toBe(true);
      expect(isFeatureEnabled('github-pr-comments', 'team')).toBe(true);
    });
  });

  describe('getRequiredTier', () => {
    it('returns correct tier for pro features', () => {
      expect(getRequiredTier('framework-panels')).toBe('pro');
      expect(getRequiredTier('network-replay')).toBe('pro');
      expect(getRequiredTier('session-replay')).toBe('pro');
      expect(getRequiredTier('vscode-bridge')).toBe('pro');
    });

    it('returns correct tier for free features', () => {
      expect(getRequiredTier('source-map-resolution')).toBe('free');
      expect(getRequiredTier('github-pr-comments')).toBe('free');
      expect(getRequiredTier('ollama-provider')).toBe('free');
    });
  });

  describe('getAllFeatureFlags', () => {
    it('returns all feature flags', () => {
      const flags = getAllFeatureFlags();
      expect(Object.keys(flags)).toHaveLength(7);
      expect(flags['framework-panels']).toBe('pro');
      expect(flags['network-replay']).toBe('pro');
      expect(flags['session-replay']).toBe('pro');
      expect(flags['vscode-bridge']).toBe('pro');
      expect(flags['source-map-resolution']).toBe('free');
      expect(flags['github-pr-comments']).toBe('free');
      expect(flags['ollama-provider']).toBe('free');
    });

    it('returns a copy of the flags object', () => {
      const flags1 = getAllFeatureFlags();
      const flags2 = getAllFeatureFlags();
      expect(flags1).toEqual(flags2);
      expect(flags1).not.toBe(flags2);
    });
  });
});
