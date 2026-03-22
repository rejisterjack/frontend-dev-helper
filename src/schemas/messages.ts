/**
 * Message Schemas (Zod)
 *
 * Validation schemas for extension messages to ensure type safety
 * and prevent malformed message handling.
 */

import { z } from 'zod';

// Base message schema
export const baseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.number().optional(),
  requestId: z.string().optional(),
});

// Tool action message schemas
export const toolActionMessageSchema = baseMessageSchema.extend({
  type: z.enum(['ENABLE', 'DISABLE', 'TOGGLE', 'GET_STATE']),
  toolId: z.string(),
});

// Ping message schema
export const pingMessageSchema = baseMessageSchema.extend({
  type: z.literal('PING'),
});

// Settings message schemas
export const getSettingsMessageSchema = baseMessageSchema.extend({
  type: z.literal('GET_SETTINGS'),
});

export const updateSettingsMessageSchema = baseMessageSchema.extend({
  type: z.literal('UPDATE_SETTINGS'),
  payload: z.record(z.unknown()),
});

// Feature toggle message schemas
export const getFeaturesMessageSchema = baseMessageSchema.extend({
  type: z.literal('GET_FEATURES'),
});

export const toggleFeatureMessageSchema = baseMessageSchema.extend({
  type: z.literal('TOGGLE_FEATURE'),
  featureId: z.string(),
  enabled: z.boolean(),
});

// Report generation message schema
export const generateReportMessageSchema = baseMessageSchema.extend({
  type: z.literal('SITE_REPORT_GENERATE'),
  payload: z.object({
    includePerformance: z.boolean().optional(),
    includeAccessibility: z.boolean().optional(),
    includeSeo: z.boolean().optional(),
    includeSecurity: z.boolean().optional(),
  }).optional(),
});

// Export message schema
export const exportReportMessageSchema = baseMessageSchema.extend({
  type: z.literal('EXPORT_GENERATE_REPORT'),
  payload: z.object({
    format: z.enum(['json', 'html', 'pdf']),
    data: z.unknown(),
  }),
});

// Content script state update schema
export const stateUpdateSchema = z.object({
  enabled: z.boolean(),
  active: z.boolean().optional(),
  error: z.string().optional(),
});

// Message union type
export const messageSchema = z.discriminatedUnion('type', [
  pingMessageSchema,
  getSettingsMessageSchema,
  updateSettingsMessageSchema,
  getFeaturesMessageSchema,
  toggleFeatureMessageSchema,
  generateReportMessageSchema,
  exportReportMessageSchema,
  toolActionMessageSchema,
]);

// Type exports
export type BaseMessage = z.infer<typeof baseMessageSchema>;
export type ToolActionMessage = z.infer<typeof toolActionMessageSchema>;
export type PingMessage = z.infer<typeof pingMessageSchema>;
export type GetSettingsMessage = z.infer<typeof getSettingsMessageSchema>;
export type UpdateSettingsMessage = z.infer<typeof updateSettingsMessageSchema>;
export type GetFeaturesMessage = z.infer<typeof getFeaturesMessageSchema>;
export type ToggleFeatureMessage = z.infer<typeof toggleFeatureMessageSchema>;
export type GenerateReportMessage = z.infer<typeof generateReportMessageSchema>;
export type ExportReportMessage = z.infer<typeof exportReportMessageSchema>;
export type Message = z.infer<typeof messageSchema>;
