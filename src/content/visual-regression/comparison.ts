/**
 * Visual Regression Comparison
 *
 * Image comparison logic for the visual regression module.
 * This module handles the orchestration between capture and diff engine.
 */

import { logger } from '@/utils/logger';
import { baselineManager } from './baseline-manager';
import { captureViewportScreenshot, generateId } from './capture';
import { diffEngine } from './diff-engine';
import type { IgnoreRegion, VisualRegressionTest } from './types';

/**
 * Comparison options
 */
export interface ComparisonOptions {
  threshold: number;
  ignoreRegions: IgnoreRegion[];
}

/**
 * Run comparison test against a baseline
 */
export async function runComparison(
  baselineId: string,
  options: ComparisonOptions
): Promise<VisualRegressionTest> {
  const baseline = await baselineManager.getBaseline(baselineId);
  if (!baseline) {
    throw new Error('Baseline not found');
  }

  // Capture current screenshot
  const currentScreenshot = await captureViewportScreenshot();

  // Compare with baseline
  const diffResult = await diffEngine.compareScreenshots(baseline.screenshot, currentScreenshot, {
    threshold: options.threshold,
    ignoreRegions: options.ignoreRegions,
    generateDiffImage: true,
  });

  // Create test result
  const test: VisualRegressionTest = {
    id: generateId(),
    url: window.location.href,
    baselineId,
    timestamp: Date.now(),
    result: diffResult,
    status: diffResult.match ? 'passed' : 'failed',
  };

  await baselineManager.saveTest(test);

  logger.log('[VisualRegression] Test completed:', test.id, diffResult.match ? 'PASSED' : 'FAILED');

  return test;
}

/**
 * Export diff image for a test
 */
export async function exportDiffImage(
  test: VisualRegressionTest,
  filename?: string
): Promise<void> {
  if (!test.result.diffImage) {
    throw new Error('Diff image not found');
  }

  const defaultFilename = `diff-${test.id}-${Date.now()}.png`;
  await diffEngine.exportDiffImage(test.result.diffImage, filename ?? defaultFilename);
}
