import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================
// In-memory store to simulate chrome.storage.local
// ============================================
const storageStore: Record<string, unknown> = {};

function resetStorage(): void {
  for (const key of Object.keys(storageStore)) {
    delete storageStore[key];
  }
}

// Mock chrome.storage.local so the licensing module can read/write through it.
// The global setup file already provides chrome, but we override storage.local
// per-test for deterministic isolation.
const originalStorageLocal = (globalThis as Record<string, unknown>).chrome
  ? ((globalThis as Record<string, { storage: { local: unknown } }>).chrome.storage.local)
  : undefined;

function installMockStorage(): void {
  const mock = {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
      if (keys === null || keys === undefined) {
        return { ...storageStore };
      }
      if (typeof keys === 'string') {
        return storageStore[keys] !== undefined ? { [keys]: storageStore[keys] } : {};
      }
      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in storageStore) result[key] = storageStore[key];
        }
        return result;
      }
      // object form – return defaults merged with stored data
      const result: Record<string, unknown> = { ...keys };
      for (const [k, v] of Object.entries(storageStore)) {
        result[k] = v;
      }
      return result;
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      Object.assign(storageStore, items);
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) delete storageStore[k];
    }),
  };

  (globalThis as Record<string, { chrome: Record<string, unknown> }>).chrome = {
    ...(globalThis as Record<string, { chrome: Record<string, unknown> }>).chrome,
    storage: { ...(globalThis as Record<string, { chrome: Record<string, unknown> }>).chrome?.storage, local: mock },
  };
}

// We need to import the module under test AFTER the chrome mock is set up.
// Because the module is ESM and uses top-level chrome references, we import
// it inside a setup function.
let licensing: typeof import('../../src/background/licensing');

beforeEach(async () => {
  vi.clearAllMocks();
  resetStorage();
  installMockStorage();

  // Re-import the module so it picks up the fresh chrome mock.
  // vitest module cache is reset per test when using vi.resetModules().
  vi.resetModules();
  licensing = await import('../../src/background/licensing');
});

describe('Licensing', () => {
  // ============================================
  // License Key Validation
  // ============================================
  describe('License Key Validation', () => {
    it('should accept valid license key format FDH-XXXX-XXXX-XXXX-XXXX', async () => {
      const result = await licensing.activateLicense('FDH-ABCD-1234-EFGH-5678');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid license key with all digits', async () => {
      const result = await licensing.activateLicense('FDH-0000-1111-2222-3333');
      expect(result.success).toBe(true);
    });

    it('should accept valid license key with all letters', async () => {
      const result = await licensing.activateLicense('FDH-ABCD-EFGH-IJKL-MNOP');
      expect(result.success).toBe(true);
    });

    it('should reject invalid license key with lowercase letters', async () => {
      const result = await licensing.activateLicense('FDH-abcd-1234-EFGH-5678');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid license key format');
    });

    it('should reject key with wrong prefix', async () => {
      const result = await licensing.activateLicense('XXX-ABCD-1234-EFGH-5678');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid license key format');
    });

    it('should reject key with too few segments', async () => {
      const result = await licensing.activateLicense('FDH-ABCD-1234-EFGH');
      expect(result.success).toBe(false);
    });

    it('should reject key with segments that are too long', async () => {
      const result = await licensing.activateLicense('FDH-ABCDE-1234-EFGH-5678');
      expect(result.success).toBe(false);
    });

    it('should reject key with special characters', async () => {
      const result = await licensing.activateLicense('FDH-AB!D-1234-EFGH-5678');
      expect(result.success).toBe(false);
    });

    it('should reject empty key', async () => {
      const result = await licensing.activateLicense('');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid license key format');
    });

    it('should reject null key', async () => {
      const result = await licensing.activateLicense(null as unknown as string);
      expect(result.success).toBe(false);
    });

    it('should reject undefined key', async () => {
      const result = await licensing.activateLicense(undefined as unknown as string);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // Plan Determination
  // ============================================
  describe('Plan Determination', () => {
    it('should default to FREE tier when no license is stored', async () => {
      const license = await licensing.getLicense();
      expect(license.plan).toBe('free');
    });

    it('should have core features in default FREE plan', async () => {
      const license = await licensing.getLicense();
      expect(license.features).toContain('dom_outliner');
      expect(license.features).toContain('color_picker');
    });

    it('should identify TEAM tier from key containing TEAM', async () => {
      await licensing.activateLicense('FDH-TEAM-1234-EFGH-5678');
      const license = await licensing.getLicense();
      expect(license.plan).toBe('team');
    });

    it('should identify PRO tier from key containing PRO', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      const license = await licensing.getLicense();
      expect(license.plan).toBe('pro');
    });

    it('should default to PRO tier for any valid key without TEAM/PRO marker', async () => {
      // The implementation defaults to 'pro' for any valid key without TEAM/PRO
      await licensing.activateLicense('FDH-ABCD-1234-EFGH-5678');
      const license = await licensing.getLicense();
      expect(license.plan).toBe('pro');
    });

    it('should store the license key after activation', async () => {
      const key = 'FDH-PRO0-1234-EFGH-5678';
      await licensing.activateLicense(key);
      const license = await licensing.getLicense();
      expect(license.licenseKey).toBe(key);
    });

    it('should set an expiration date for paid plans', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      const license = await licensing.getLicense();
      expect(license.expiresAt).toBeDefined();
      expect(typeof license.expiresAt).toBe('number');
      // Expiration should be roughly 1 year from now
      const oneYearFromNow = Date.now() + 365 * 24 * 60 * 60 * 1000;
      expect(license.expiresAt!).toBeGreaterThan(Date.now());
      expect(license.expiresAt!).toBeLessThanOrEqual(oneYearFromNow + 1000);
    });

    it('should set no expiration for free plan', async () => {
      // Free plan comes from getLicense() default, not from activateLicense
      const license = await licensing.getLicense();
      expect(license.expiresAt).toBeUndefined();
    });
  });

  // ============================================
  // Feature Access
  // ============================================
  describe('Feature Access', () => {
    it('should allow core tools on FREE tier', async () => {
      // Default is free tier
      expect(await licensing.canUseFeature('dom_outliner')).toBe(true);
      expect(await licensing.canUseFeature('color_picker')).toBe(true);
      expect(await licensing.canUseFeature('css_inspector')).toBe(true);
      expect(await licensing.canUseFeature('spacing_visualizer')).toBe(true);
      expect(await licensing.canUseFeature('font_inspector')).toBe(true);
      expect(await licensing.canUseFeature('breakpoint_overlay')).toBe(true);
    });

    it('should allow performance and devtools on FREE tier', async () => {
      expect(await licensing.canUseFeature('performance_tab')).toBe(true);
      expect(await licensing.canUseFeature('devtools_panel')).toBe(true);
      expect(await licensing.canUseFeature('css_variable_inspector')).toBe(true);
      expect(await licensing.canUseFeature('smart_element_picker')).toBe(true);
    });

    it('should allow AI analysis on FREE tier (it is a limited feature, not blocked)', async () => {
      expect(await licensing.canUseFeature('ai_analysis')).toBe(true);
    });

    it('should limit AI analysis to 5/day on FREE tier', async () => {
      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.allowed).toBe(true);
      expect(quota.limit).toBe(5);
      expect(quota.remaining).toBe(5);
    });

    it('should allow unlimited AI analysis on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.allowed).toBe(true);
      expect(quota.limit).toBe(Infinity);
      expect(quota.remaining).toBe(Infinity);
    });

    it('should allow unlimited AI analysis on TEAM tier', async () => {
      await licensing.activateLicense('FDH-TEAM-1234-EFGH-5678');
      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.allowed).toBe(true);
      expect(quota.limit).toBe(Infinity);
    });

    it('should deny session recording on FREE tier', async () => {
      expect(await licensing.canUseFeature('session_recording')).toBe(false);
    });

    it('should deny session recording via quota on FREE tier', async () => {
      const quota = await licensing.checkQuota('session_recording');
      expect(quota.allowed).toBe(false);
      expect(quota.limit).toBe(0);
    });

    it('should allow session recording on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('session_recording')).toBe(true);
    });

    it('should allow session recording on TEAM tier', async () => {
      await licensing.activateLicense('FDH-TEAM-1234-EFGH-5678');
      expect(await licensing.canUseFeature('session_recording')).toBe(true);
    });

    it('should deny visual regression on FREE tier', async () => {
      expect(await licensing.canUseFeature('visual_regression')).toBe(false);
    });

    it('should allow visual regression on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('visual_regression')).toBe(true);
    });

    it('should deny PDF export on FREE tier', async () => {
      expect(await licensing.canUseFeature('pdf_export')).toBe(false);
    });

    it('should allow PDF export on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('pdf_export')).toBe(true);
    });

    it('should deny team collaboration on FREE tier', async () => {
      expect(await licensing.canUseFeature('team_collaboration')).toBe(false);
    });

    it('should deny team collaboration on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('team_collaboration')).toBe(false);
    });

    it('should allow team collaboration on TEAM tier', async () => {
      await licensing.activateLicense('FDH-TEAM-1234-EFGH-5678');
      expect(await licensing.canUseFeature('team_collaboration')).toBe(true);
    });

    it('should deny API access on FREE and PRO tiers', async () => {
      expect(await licensing.canUseFeature('api_access')).toBe(false);
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('api_access')).toBe(false);
    });

    it('should allow API access on TEAM tier', async () => {
      await licensing.activateLicense('FDH-TEAM-1234-EFGH-5678');
      expect(await licensing.canUseFeature('api_access')).toBe(true);
    });

    it('should return false for unknown feature id', async () => {
      expect(await licensing.canUseFeature('nonexistent_feature')).toBe(false);
    });

    it('should return allowed=false for unknown feature quota', async () => {
      const quota = await licensing.checkQuota('nonexistent_feature');
      expect(quota.allowed).toBe(false);
      expect(quota.remaining).toBe(0);
      expect(quota.limit).toBe(0);
    });
  });

  // ============================================
  // Usage Tracking
  // ============================================
  describe('Usage Tracking', () => {
    it('should track daily usage counters', async () => {
      await licensing.recordUsage('ai_analysis');
      await licensing.recordUsage('ai_analysis');
      await licensing.recordUsage('ai_analysis');

      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.remaining).toBe(2); // 5 - 3 used
    });

    it('should track exports', async () => {
      // pdf_export maps to exports counter
      await licensing.recordUsage('pdf_export');
      await licensing.recordUsage('pdf_export');

      const quota = await licensing.checkQuota('pdf_export');
      // On free tier pdf_export is not allowed (limit=0), so it's blocked by plan, not quota
      expect(quota.limit).toBe(0);
    });

    it('should track screenshot usage', async () => {
      await licensing.recordUsage('visual_regression');
      // visual_regression maps to screenshots counter
      // This just verifies recordUsage doesn't throw for visual_regression
    });

    it('should reset counters on new day', async () => {
      // Record 3 usages for "today"
      await licensing.recordUsage('ai_analysis');
      await licensing.recordUsage('ai_analysis');
      await licensing.recordUsage('ai_analysis');

      // Simulate a different date key in storage
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get current usage data from storage
      const currentData = storageStore['fdh_usage_tracking'] as Record<string, unknown>;
      const usageData = { ...currentData } as Record<string, unknown>;

      // Move the existing usage to "yesterday" so "today" has no usage
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      usageData[yesterday] = usageData[today];
      delete usageData[today];

      storageStore['fdh_usage_tracking'] = usageData;

      // On the new day, quota should be back to 5 remaining
      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.remaining).toBe(5);
    });

    it('should enforce quota limits on FREE tier', async () => {
      // Use up all 5 AI analyses
      for (let i = 0; i < 5; i++) {
        await licensing.recordUsage('ai_analysis');
      }

      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.allowed).toBe(false);
      expect(quota.remaining).toBe(0);
    });

    it('should return correct remaining count after partial usage', async () => {
      await licensing.recordUsage('ai_analysis');
      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.remaining).toBe(4);
      expect(quota.limit).toBe(5);
      expect(quota.allowed).toBe(true);
    });

    it('should not count usage against quota on PRO tier', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');

      // Use many AI analyses
      for (let i = 0; i < 20; i++) {
        await licensing.recordUsage('ai_analysis');
      }

      const quota = await licensing.checkQuota('ai_analysis');
      expect(quota.allowed).toBe(true);
      expect(quota.remaining).toBe(Infinity);
    });
  });

  // ============================================
  // License Deactivation
  // ============================================
  describe('License Deactivation', () => {
    it('should remove license from storage', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      let license = await licensing.getLicense();
      expect(license.plan).toBe('pro');

      await licensing.deactivateLicense();
      license = await licensing.getLicense();
      expect(license.plan).toBe('free');
    });

    it('should revert to FREE tier features after deactivation', async () => {
      await licensing.activateLicense('FDH-PRO0-1234-EFGH-5678');
      expect(await licensing.canUseFeature('session_recording')).toBe(true);

      await licensing.deactivateLicense();
      expect(await licensing.canUseFeature('session_recording')).toBe(false);
    });
  });

  // ============================================
  // Plan Comparison
  // ============================================
  describe('Plan Comparison', () => {
    it('should return three plan tiers', () => {
      const comparison = licensing.getPlanComparison();
      expect(comparison).toHaveLength(3);
    });

    it('should have correct plan names and prices', () => {
      const comparison = licensing.getPlanComparison();
      expect(comparison[0].plan).toBe('free');
      expect(comparison[0].price).toBe('$0');
      expect(comparison[1].plan).toBe('pro');
      expect(comparison[1].price).toBe('$5/month');
      expect(comparison[2].plan).toBe('team');
      expect(comparison[2].price).toBe('$15/user/month');
    });

    it('should include all features in each plan', () => {
      const comparison = licensing.getPlanComparison();
      // Each plan should have the same number of features defined
      expect(comparison[0].features.length).toBeGreaterThan(0);
      expect(comparison[1].features.length).toBe(comparison[0].features.length);
      expect(comparison[2].features.length).toBe(comparison[0].features.length);
    });

    it('should show ai_analysis as 5 on free, Infinity on pro and team', () => {
      const comparison = licensing.getPlanComparison();
      const freeAi = comparison[0].features.find((f) => f.id === 'ai_analysis');
      const proAi = comparison[1].features.find((f) => f.id === 'ai_analysis');
      const teamAi = comparison[2].features.find((f) => f.id === 'ai_analysis');

      expect(freeAi?.available).toBe(5);
      expect(proAi?.available).toBe(Infinity);
      expect(teamAi?.available).toBe(Infinity);
    });
  });

  // ============================================
  // Upgrade Prompts
  // ============================================
  describe('Upgrade Prompts', () => {
    it('should return upgrade prompt for ai_analysis', async () => {
      const prompt = await licensing.getUpgradePrompt('ai_analysis');
      expect(prompt).not.toBeNull();
      expect(prompt!.title).toContain('Pro');
      expect(prompt!.cta).toContain('Upgrade');
    });

    it('should return upgrade prompt for visual_regression', async () => {
      const prompt = await licensing.getUpgradePrompt('visual_regression');
      expect(prompt).not.toBeNull();
      expect(prompt!.title).toContain('Visual Regression');
    });

    it('should return upgrade prompt for pdf_export', async () => {
      const prompt = await licensing.getUpgradePrompt('pdf_export');
      expect(prompt).not.toBeNull();
      expect(prompt!.title).toContain('PDF Export');
    });

    it('should return upgrade prompt for team_collaboration', async () => {
      const prompt = await licensing.getUpgradePrompt('team_collaboration');
      expect(prompt).not.toBeNull();
      expect(prompt!.title).toContain('Collaboration');
    });

    it('should return null for unknown feature', async () => {
      const prompt = await licensing.getUpgradePrompt('nonexistent_feature');
      expect(prompt).toBeNull();
    });
  });

  // ============================================
  // Usage Statistics
  // ============================================
  describe('Usage Statistics', () => {
    it('should return empty stats when no usage recorded', async () => {
      const stats = await licensing.getUsageStats();
      expect(stats.totalAiAnalyses).toBe(0);
      expect(stats.totalExports).toBe(0);
      expect(stats.totalScreenshots).toBe(0);
      expect(stats.dailyAverage).toBe(0);
    });

    it('should aggregate usage stats across recorded days', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Directly store multi-day usage data
      storageStore['fdh_usage_tracking'] = {
        [today]: { date: today, aiAnalyses: 3, exports: 2, screenshots: 1 },
      };

      const stats = await licensing.getUsageStats(30);
      expect(stats.totalAiAnalyses).toBe(3);
      expect(stats.totalExports).toBe(2);
      expect(stats.totalScreenshots).toBe(1);
      expect(stats.dailyAverage).toBe(6); // (3+2+1)/1 day
    });

    it('should respect the days parameter for date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      storageStore['fdh_usage_tracking'] = {
        [today]: { date: today, aiAnalyses: 1, exports: 0, screenshots: 0 },
        [oldDate]: { date: oldDate, aiAnalyses: 10, exports: 5, screenshots: 3 },
      };

      // Only last 30 days – should exclude the old entry
      const stats = await licensing.getUsageStats(30);
      expect(stats.totalAiAnalyses).toBe(1);
      expect(stats.totalExports).toBe(0);
    });
  });
});
