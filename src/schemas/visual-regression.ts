/**
 * Visual Regression Data Schemas (Zod)
 *
 * Validation schemas for import/export data to prevent injection attacks.
 */

import { z } from 'zod';

// Ignore region schema
const ignoreRegionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(1),
  height: z.number().min(1),
});

// Baseline screenshot schema
const baselineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  url: z.string().url(),
  viewport: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
  timestamp: z.number().positive(),
  dataUrl: z.string().regex(/^data:image\/png;base64,/),
  ignoreRegions: z.array(ignoreRegionSchema).optional().default([]),
});

// Test result schema
const testResultSchema = z.object({
  id: z.string().uuid(),
  baselineId: z.string().uuid(),
  timestamp: z.number().positive(),
  passed: z.boolean(),
  diffPercentage: z.number().min(0).max(100),
  threshold: z.number().min(0).max(100),
  viewport: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
  diffDataUrl: z
    .string()
    .regex(/^data:image\/png;base64,/)
    .optional(),
});

// Export data schema
export const visualRegressionExportSchema = z.object({
  version: z.literal('1.0'),
  type: z.literal('visual-regression-data'),
  timestamp: z.number().positive(),
  data: z.object({
    baselines: z.array(baselineSchema),
    tests: z.array(testResultSchema),
    threshold: z.number().min(0).max(100),
    ignoreRegions: z.array(ignoreRegionSchema).optional().default([]),
  }),
});

export type VisualRegressionExportData = z.infer<typeof visualRegressionExportSchema>;
