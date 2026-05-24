import { describe, it, expect, beforeEach } from 'vitest';
import { useSubscriptionStore } from '@/stores/use-subscription-store';
import type { SubscriptionTier } from '@/lib/types';

describe('useSubscriptionStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useSubscriptionStore.setState({ tier: 'free' });
  });

  it('creates store with free tier', () => {
    const state = useSubscriptionStore.getState();
    expect(state.tier).toBe('free');
  });

  it('setTier updates tier', () => {
    useSubscriptionStore.getState().setTier('pro');
    expect(useSubscriptionStore.getState().tier).toBe('pro');

    useSubscriptionStore.getState().setTier('team');
    expect(useSubscriptionStore.getState().tier).toBe('team');

    useSubscriptionStore.getState().setTier('free');
    expect(useSubscriptionStore.getState().tier).toBe('free');
  });

  it('isPremium returns false for free, true for pro/team', () => {
    // Free tier
    useSubscriptionStore.getState().setTier('free');
    expect(useSubscriptionStore.getState().isPremium()).toBe(false);

    // Pro tier
    useSubscriptionStore.getState().setTier('pro');
    expect(useSubscriptionStore.getState().isPremium()).toBe(true);

    // Team tier
    useSubscriptionStore.getState().setTier('team');
    expect(useSubscriptionStore.getState().isPremium()).toBe(true);
  });
});
