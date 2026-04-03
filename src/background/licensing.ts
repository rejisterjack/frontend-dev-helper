/**
 * Licensing & Freemium Model
 *
 * Manages free tier limitations and Pro/Team subscriptions.
 * - Tracks usage quotas for free users
 * - Validates license keys
 * - Manages feature access control
 *
 * **Source of truth for feature gates and quotas.** Keep store copy and `monetization/README.md`
 * (pricing table, Stripe tiers) aligned with `FEATURE_MATRIX` / `ai_analysis` limits here.
 */

import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

export type PlanType = 'free' | 'pro' | 'team';

export interface LicenseInfo {
  plan: PlanType;
  licenseKey?: string;
  activatedAt: number;
  expiresAt?: number;
  features: string[];
  quotas: Record<string, number>;
}

export interface UsageTracking {
  date: string; // YYYY-MM-DD
  aiAnalyses: number;
  exports: number;
  screenshots: number;
}

interface FeatureDefinition {
  id: string;
  name: string;
  free: boolean | number;
  pro: boolean | number;
  team: boolean | number;
}

// ============================================
// Feature Definitions
// ============================================

const FEATURES: FeatureDefinition[] = [
  // Core tools (always available)
  { id: 'dom_outliner', name: 'DOM Outliner', free: true, pro: true, team: true },
  { id: 'color_picker', name: 'Color Picker', free: true, pro: true, team: true },
  { id: 'css_inspector', name: 'CSS Inspector', free: true, pro: true, team: true },
  { id: 'spacing_visualizer', name: 'Spacing Visualizer', free: true, pro: true, team: true },
  { id: 'font_inspector', name: 'Font Inspector', free: true, pro: true, team: true },
  { id: 'breakpoint_overlay', name: 'Breakpoint Overlay', free: true, pro: true, team: true },

  // Advanced tools (always available)
  { id: 'performance_tab', name: 'Performance Analysis', free: true, pro: true, team: true },
  { id: 'devtools_panel', name: 'DevTools Panel', free: true, pro: true, team: true },
  {
    id: 'css_variable_inspector',
    name: 'CSS Variable Inspector',
    free: true,
    pro: true,
    team: true,
  },
  { id: 'smart_element_picker', name: 'Smart Element Picker', free: true, pro: true, team: true },

  // Limited features
  { id: 'ai_analysis', name: 'AI Analysis', free: 5, pro: Infinity, team: Infinity },
  { id: 'session_recording', name: 'Session Recording', free: 0, pro: true, team: true },
  { id: 'visual_regression', name: 'Visual Regression', free: 0, pro: true, team: true },
  { id: 'pdf_export', name: 'PDF Export', free: 0, pro: true, team: true },
  { id: 'team_collaboration', name: 'Team Collaboration', free: 0, pro: 0, team: true },
  { id: 'api_access', name: 'API Access', free: 0, pro: 0, team: true },

  // Support
  { id: 'email_support', name: 'Email Support', free: false, pro: true, team: true },
  { id: 'priority_support', name: 'Priority Support', free: false, pro: false, team: true },
];

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  LICENSE: 'fdh_license_info',
  USAGE: 'fdh_usage_tracking',
};

// ============================================
// License Management
// ============================================

/**
 * Get current license info
 */
export async function getLicense(): Promise<LicenseInfo> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LICENSE);
  return (
    result[STORAGE_KEYS.LICENSE] || {
      plan: 'free',
      activatedAt: Date.now(),
      features: getFeaturesForPlan('free'),
      quotas: {},
    }
  );
}

/**
 * Activate a license key
 */
export async function activateLicense(
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate license key format
    if (!isValidLicenseFormat(licenseKey)) {
      return { success: false, error: 'Invalid license key format' };
    }

    // In a real implementation, this would validate against a license server
    // For now, we'll simulate with a simple check
    const plan = determinePlanFromKey(licenseKey);

    const licenseInfo: LicenseInfo = {
      plan,
      licenseKey,
      activatedAt: Date.now(),
      expiresAt: plan === 'free' ? undefined : Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      features: getFeaturesForPlan(plan),
      quotas: {},
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.LICENSE]: licenseInfo });

    logger.log('[Licensing] Activated', plan, 'license');
    return { success: true };
  } catch (error) {
    logger.error('[Licensing] Activation failed:', error);
    return { success: false, error: 'Activation failed' };
  }
}

/**
 * Deactivate current license
 */
export async function deactivateLicense(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.LICENSE);
  logger.log('[Licensing] License deactivated');
}

/**
 * Validate license key format
 */
function isValidLicenseFormat(key: string): boolean {
  // Format: FDH-XXXX-XXXX-XXXX-XXXX
  return /^FDH-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key);
}

/**
 * Determine plan from license key (simulated)
 */
function determinePlanFromKey(key: string): PlanType {
  // In reality, this would validate against a server
  if (key.includes('TEAM')) return 'team';
  if (key.includes('PRO')) return 'pro';
  return 'pro'; // Default to pro for any valid key in demo
}

// ============================================
// Feature Access
// ============================================

/**
 * Get features available for a plan
 */
function getFeaturesForPlan(plan: PlanType): string[] {
  return FEATURES.filter((f) => {
    const access = f[plan];
    return access === true || (typeof access === 'number' && access > 0);
  }).map((f) => f.id);
}

/**
 * Check if a feature is available
 */
export async function canUseFeature(featureId: string): Promise<boolean> {
  const license = await getLicense();
  return license.features.includes(featureId);
}

/**
 * Check feature usage quota
 */
export async function checkQuota(
  featureId: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const license = await getLicense();
  const feature = FEATURES.find((f) => f.id === featureId);

  if (!feature) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const limit = feature[license.plan];

  // Unlimited
  if (limit === true || limit === Infinity) {
    return { allowed: true, remaining: Infinity, limit: Infinity };
  }

  // Not available
  if (limit === false || limit === 0) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  // Check usage
  const usage = await getFeatureUsage(featureId);
  const remaining = Math.max(0, (limit as number) - usage);

  return {
    allowed: remaining > 0,
    remaining,
    limit: limit as number,
  };
}

/**
 * Record feature usage
 */
export async function recordUsage(featureId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(STORAGE_KEYS.USAGE);
  const usageData: Record<string, UsageTracking> = result[STORAGE_KEYS.USAGE] || {};

  if (!usageData[today]) {
    usageData[today] = {
      date: today,
      aiAnalyses: 0,
      exports: 0,
      screenshots: 0,
    };
  }

  // Map feature to usage counter
  switch (featureId) {
    case 'ai_analysis':
      usageData[today].aiAnalyses++;
      break;
    case 'pdf_export':
    case 'markdown_export':
      usageData[today].exports++;
      break;
    case 'screenshot_studio':
    case 'visual_regression':
      usageData[today].screenshots++;
      break;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.USAGE]: usageData });
}

/**
 * Get feature usage for today
 */
async function getFeatureUsage(featureId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const result = await chrome.storage.local.get(STORAGE_KEYS.USAGE);
  const usageData: Record<string, UsageTracking> = result[STORAGE_KEYS.USAGE] || {};
  const todayUsage = usageData[today];

  if (!todayUsage) return 0;

  switch (featureId) {
    case 'ai_analysis':
      return todayUsage.aiAnalyses;
    case 'pdf_export':
    case 'markdown_export':
      return todayUsage.exports;
    case 'screenshot_studio':
      return todayUsage.screenshots;
    default:
      return 0;
  }
}

// ============================================
// Plan Comparison
// ============================================

export interface PlanComparison {
  plan: PlanType;
  name: string;
  price: string;
  features: Array<{
    id: string;
    name: string;
    available: boolean | number;
    highlight?: boolean;
  }>;
}

/**
 * Get plan comparison for display
 */
export function getPlanComparison(): PlanComparison[] {
  return [
    {
      plan: 'free',
      name: 'Free',
      price: '$0',
      features: FEATURES.map((f) => ({
        id: f.id,
        name: f.name,
        available: f.free,
        highlight: f.free === true,
      })),
    },
    {
      plan: 'pro',
      name: 'Pro',
      price: '$5/month',
      features: FEATURES.map((f) => ({
        id: f.id,
        name: f.name,
        available: f.pro,
        highlight: f.pro === true && f.free !== true,
      })),
    },
    {
      plan: 'team',
      name: 'Team',
      price: '$15/user/month',
      features: FEATURES.map((f) => ({
        id: f.id,
        name: f.name,
        available: f.team,
        highlight: f.team === true && f.pro !== true,
      })),
    },
  ];
}

// ============================================
// Upgrade Prompts
// ============================================

/**
 * Get upgrade prompt for a feature
 */
export async function getUpgradePrompt(
  featureId: string
): Promise<{ title: string; description: string; cta: string } | null> {
  const feature = FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  const prompts: Record<string, { title: string; description: string; cta: string }> = {
    ai_analysis: {
      title: 'Upgrade to Pro for Unlimited AI',
      description:
        "You've used your 5 free AI analyses today. Upgrade to Pro for unlimited AI-powered suggestions.",
      cta: 'Upgrade to Pro - $5/month',
    },
    visual_regression: {
      title: 'Pro Feature: Visual Regression',
      description:
        'Visual regression testing helps catch unintended UI changes. Upgrade to Pro to use this feature.',
      cta: 'Upgrade to Pro',
    },
    pdf_export: {
      title: 'Pro Feature: PDF Export',
      description:
        'Export your site reports as professional PDFs. Upgrade to Pro to unlock this feature.',
      cta: 'Upgrade to Pro',
    },
    team_collaboration: {
      title: 'Team Feature: Collaboration',
      description:
        'Share sessions and collaborate with your team. Upgrade to Team to unlock this feature.',
      cta: 'Upgrade to Team',
    },
  };

  return prompts[featureId] || null;
}

// ============================================
// Analytics
// ============================================

/**
 * Get usage statistics
 */
export async function getUsageStats(days: number = 30): Promise<{
  totalAiAnalyses: number;
  totalExports: number;
  totalScreenshots: number;
  dailyAverage: number;
}> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.USAGE);
  const usageData: Record<string, UsageTracking> = result[STORAGE_KEYS.USAGE] || {};

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  let totalAiAnalyses = 0;
  let totalExports = 0;
  let totalScreenshots = 0;
  let dayCount = 0;

  for (const [date, usage] of Object.entries(usageData)) {
    if (date >= cutoffStr) {
      totalAiAnalyses += usage.aiAnalyses;
      totalExports += usage.exports;
      totalScreenshots += usage.screenshots;
      dayCount++;
    }
  }

  return {
    totalAiAnalyses,
    totalExports,
    totalScreenshots,
    dailyAverage:
      dayCount > 0 ? Math.round((totalAiAnalyses + totalExports + totalScreenshots) / dayCount) : 0,
  };
}

// Default export
export default {
  getLicense,
  activateLicense,
  deactivateLicense,
  canUseFeature,
  checkQuota,
  recordUsage,
  getPlanComparison,
  getUpgradePrompt,
  getUsageStats,
};
