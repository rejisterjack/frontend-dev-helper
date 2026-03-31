/**
 * Tool Schemas (Zod)
 *
 * Validation schemas for tool state and configuration.
 */

import { z } from 'zod';

// Tool ID schema (validates known tool IDs)
export const toolIdSchema = z.enum([
  'pesticide',
  'domOutliner',
  'cssInspector',
  'colorPicker',
  'fontInspector',
  'ruler',
  'measureTool',
  'gridOverlay',
  'responsiveTester',
  'breakpointAnalyzer',
  'performanceMonitor',
  'networkAnalyzer',
  'consolePlus',
  'storageInspector',
  'cookieManager',
  'apiTester',
  'formValidator',
  'accessibilityChecker',
  'seoAnalyzer',
  'screenshotTool',
  'designMode',
  'whatFont',
  'visualRegression',
  'smartSuggestions',
]);

// Tool state schema
export const toolStateSchema = z.object({
  enabled: z.boolean(),
  active: z.boolean().optional(),
  visible: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

// Tools state record schema
export const toolsStateSchema = z.record(toolIdSchema, toolStateSchema);

// Tool configuration schemas
export const pesticideConfigSchema = z.object({
  showClasses: z.boolean().default(true),
  showIds: z.boolean().default(true),
  highlightDivs: z.boolean().default(true),
});

export const gridOverlayConfigSchema = z.object({
  columns: z.number().min(2).max(24).default(12),
  gutterWidth: z.number().min(0).max(100).default(24),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('rgba(99, 102, 241, 0.2)'),
});

export const responsiveTesterConfigSchema = z.object({
  viewport: z.object({
    width: z.number().min(320).max(7680),
    height: z.number().min(240).max(4320),
  }),
  deviceScale: z.number().min(0.5).max(3).default(1),
});

export const visualRegressionConfigSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.1),
  ignoreRegions: z
    .array(
      z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      })
    )
    .default([]),
});

// Type exports
export type ToolId = z.infer<typeof toolIdSchema>;
export type ToolState = z.infer<typeof toolStateSchema>;
export type ToolsState = z.infer<typeof toolsStateSchema>;
export type PesticideConfig = z.infer<typeof pesticideConfigSchema>;
export type GridOverlayConfig = z.infer<typeof gridOverlayConfigSchema>;
export type ResponsiveTesterConfig = z.infer<typeof responsiveTesterConfigSchema>;
export type VisualRegressionConfig = z.infer<typeof visualRegressionConfigSchema>;
