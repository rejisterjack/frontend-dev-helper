/**
 * Storage Schemas (Zod)
 *
 * Validation schemas for extension storage items.
 */

import { z } from 'zod';

// Storage area schema
export const storageAreaSchema = z.enum(['local', 'session', 'sync', 'managed']);

// Storage item schema
export const storageItemSchema = z.object({
  key: z.string().min(1).max(500),
  value: z.unknown(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'null']),
  size: z.number().min(0),
  area: storageAreaSchema,
  timestamp: z.number().optional(),
});

// Extension settings schema
export const extensionSettingsSchema = z.object({
  version: z.string(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  defaultTools: z.array(z.string()).default([]),
  shortcuts: z.record(z.string(), z.string()).default({}),
  notifications: z
    .object({
      enabled: z.boolean().default(true),
      onInstall: z.boolean().default(true),
      onUpdate: z.boolean().default(true),
    })
    .default({ enabled: true, onInstall: true, onUpdate: true }),
  privacy: z
    .object({
      analyticsEnabled: z.boolean().default(false),
      shareUsageData: z.boolean().default(false),
    })
    .default({ analyticsEnabled: false, shareUsageData: false }),
});

// Feature flags schema
export const featureFlagsSchema = z.object({
  experimentalTools: z.boolean().default(false),
  betaFeatures: z.boolean().default(false),
  devMode: z.boolean().default(false),
});

// Storage keys schema
export const storageKeysSchema = z.object({
  settings: z.literal('fdh_settings'),
  features: z.literal('fdh_features'),
  toolsState: z.literal('fdh_tools_state'),
  version: z.literal('fdh_version'),
});

// Type exports
export type StorageArea = z.infer<typeof storageAreaSchema>;
export type StorageItem = z.infer<typeof storageItemSchema>;
export type ExtensionSettings = z.infer<typeof extensionSettingsSchema>;
export type FeatureFlags = z.infer<typeof featureFlagsSchema>;
export type StorageKeys = z.infer<typeof storageKeysSchema>;
