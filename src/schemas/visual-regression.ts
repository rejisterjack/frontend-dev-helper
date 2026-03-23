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
  url: z.string().url(),
  pathname: z.string(),
  viewport: z.object({
    width: z.number().min(1),
    height: z.number().min(1),
  }),
  timestamp: z.number().positive(),
  screenshot: z.string().regex(/^data:image\/png;base64,/),
  devicePixelRatio: z.number().positive(),
});

// Test result schema
const testResultSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  baselineId: z.string().uuid(),
  timestamp: z.number().positive(),
  status: z.enum(['pending', 'passed', 'failed', 'approved']),
  result: z.object({
    match: z.boolean(),
    diffPercentage: z.number().min(0).max(100),
    pixelsDifferent: z.number().min(0),
    totalPixels: z.number().min(0),
    diffImage: z.string().optional(),
    threshold: z.number().min(0).max(100),
  }),
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
