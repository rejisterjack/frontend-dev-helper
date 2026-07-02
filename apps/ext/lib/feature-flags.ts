import type { SubscriptionTier, FeatureFlag } from "./types";

const FEATURE_FLAGS: Record<FeatureFlag, SubscriptionTier> = {
  // Free tier — core inspection and bridge
  "source-map-resolution": "free",
  "vscode-bridge": "free",
  "element-inspector": "free",
  "css-inspector": "free",
  "dom-outliner": "free",
  "tech-detector": "free",
  "color-picker": "free",
  "contrast-checker": "free",
  "accessibility-audit": "free",
  "ollama-provider": "free",
  "github-pr-comments": "free",

  // Pro tier — AI tools, advanced CSS, framework panels
  "ai-tools": "pro",
  "ai-auto-fix": "pro",
  "smart-suggestions": "pro",
  "specificity-cascade": "pro",
  "css-editor": "pro",
  "css-scanner": "pro",
  "css-variable-inspector": "pro",
  "layout-visualizer": "pro",
  "framework-panels": "pro",
  "react-state-panel": "pro",
  "vue-state-panel": "pro",
  "performance-audit": "pro",
  "flame-graph": "pro",
  "network-analyzer": "pro",
  "network-replay": "pro",
  "session-replay": "pro",
  "visual-regression": "pro",
  "screenshot-studio": "pro",
  "site-report-generator": "pro",
  "full-audit": "pro",
};

const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  team: 2,
};

const FREE_A11Y_ISSUE_LIMIT = 5;

export function isFeatureEnabled(
  featureId: FeatureFlag,
  currentTier: SubscriptionTier,
): boolean {
  const required = FEATURE_FLAGS[featureId] ?? "free";
  return TIER_LEVELS[currentTier] >= TIER_LEVELS[required];
}

export function getRequiredTier(featureId: FeatureFlag): SubscriptionTier {
  return FEATURE_FLAGS[featureId] ?? "free";
}

export function getAllFeatureFlags(): Record<FeatureFlag, SubscriptionTier> {
  return { ...FEATURE_FLAGS };
}

export function getA11yIssueLimit(tier: SubscriptionTier): number {
  return tier === "free" ? FREE_A11Y_ISSUE_LIMIT : Infinity;
}

export function getFreeFeatures(): FeatureFlag[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, tier]) => tier === "free")
    .map(([id]) => id as FeatureFlag);
}

export function getProFeatures(): FeatureFlag[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, tier]) => tier === "pro")
    .map(([id]) => id as FeatureFlag);
}
