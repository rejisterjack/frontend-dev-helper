/**
 * Visual Regression Module
 *
 * Main module for visual regression testing that provides:
 * - Baseline screenshot capture (viewport or full page)
 * - Screenshot comparison with configurable threshold
 * - Diff visualization with color overlay
 * - Ignore regions support
 * - Approve/reject workflow
 * - Batch testing support
 * - Export functionality
 *
 * Uses Shadow DOM for UI isolation.
 */

import { visualRegressionExportSchema } from '@/schemas/visual-regression';
import type { BaselineScreenshot, VisualRegressionState, VisualRegressionTest } from '@/types';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';
import { baselineManager } from './baseline-manager';
import { captureFullPageScreenshot, captureViewportScreenshot, generateId } from './capture';
import { exportDiffImage as exportDiffImageInternal, runComparison } from './comparison';
import { DEFAULT_THRESHOLD, PREFIX, STATUS_TIMEOUT } from './constants';
import type { CreateBaselineOptions, IgnoreRegion } from './types';
import {
  getPanelHTML,
  getStyles,
  renderBaselineItem,
  renderEmptyState,
  renderExportDropdown,
  renderIgnoreRegionItem,
  renderTestItem,
} from './ui';

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentState: VisualRegressionState = {
  baselines: [],
  tests: [],
  threshold: DEFAULT_THRESHOLD,
  ignoreRegions: [],
};
let selectedBaselineId: string | null = null;
let isCapturing = false;

// ============================================
// Public API
// ============================================

/**
 * Enable the visual regression tool
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  loadState();
  logger.log('[VisualRegression] Enabled');
}

/**
 * Disable the visual regression tool
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  baselineManager.closeDatabase();
  logger.log('[VisualRegression] Disabled');
}

/**
 * Toggle the visual regression tool
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): {
  enabled: boolean;
  isPanelOpen: boolean;
  isCapturing: boolean;
  selectedBaseline: string | null;
  threshold: number;
} {
  return {
    enabled: isEnabled,
    isPanelOpen,
    isCapturing,
    selectedBaseline: selectedBaselineId,
    threshold: currentState.threshold,
  };
}

/**
 * Set the comparison threshold
 */
export function setThreshold(threshold: number): void {
  currentState.threshold = Math.max(0, Math.min(100, threshold));
  updateSettingsUI();
  logger.log('[VisualRegression] Threshold set to:', currentState.threshold);
}

// ============================================
// Screenshot Capture
// ============================================

export { captureFullPageScreenshot, captureViewportScreenshot };

/**
 * Create a baseline screenshot
 */
export async function createBaseline(
  options: CreateBaselineOptions = {}
): Promise<BaselineScreenshot> {
  if (isCapturing) {
    throw new Error('Already capturing screenshot');
  }

  isCapturing = true;
  updateStatus('Capturing...');

  try {
    const screenshot = options.fullPage
      ? await captureFullPageScreenshot()
      : await captureViewportScreenshot();

    const baseline: BaselineScreenshot = {
      id: generateId(),
      url: window.location.href,
      pathname: window.location.pathname,
      timestamp: Date.now(),
      screenshot,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      devicePixelRatio: window.devicePixelRatio,
    };

    await baselineManager.saveBaseline(baseline);
    await refreshState();

    updateStatus('Baseline created');
    logger.log('[VisualRegression] Baseline created:', baseline.id);

    return baseline;
  } finally {
    isCapturing = false;
  }
}

/**
 * Capture and compare against existing baseline
 */
export async function runTest(baselineId: string): Promise<VisualRegressionTest> {
  if (isCapturing) {
    throw new Error('Already capturing screenshot');
  }

  isCapturing = true;
  updateStatus('Running test...');

  try {
    const test = await runComparison(baselineId, {
      threshold: currentState.threshold,
      ignoreRegions: currentState.ignoreRegions,
    });

    await refreshState();
    updateStatus(test.status === 'passed' ? 'Test passed' : 'Test failed');

    return test;
  } finally {
    isCapturing = false;
  }
}

/**
 * Run batch tests for all baselines on current page
 */
export async function runBatchTests(): Promise<VisualRegressionTest[]> {
  const baselines = await baselineManager.getBaselinesByUrl(window.location.href);

  if (baselines.length === 0) {
    updateStatus('No baselines found for this page');
    return [];
  }

  const results: VisualRegressionTest[] = [];

  for (let i = 0; i < baselines.length; i++) {
    updateStatus(`Running test ${i + 1} of ${baselines.length}...`);
    try {
      const test = await runTest(baselines[i].id);
      results.push(test);
    } catch (error) {
      logger.error('[VisualRegression] Test failed:', error);
    }
  }

  updateStatus(
    `Batch complete: ${results.filter((r) => r.status === 'passed').length}/${results.length} passed`
  );
  return results;
}

// ============================================
// Test Management
// ============================================

/**
 * Approve a failed test (update baseline)
 */
export async function approveTest(testId: string): Promise<void> {
  const test = currentState.tests.find((t) => t.id === testId);
  if (!test) {
    throw new Error('Test not found');
  }

  // Capture new baseline
  const newBaseline = await createBaseline();

  // Update test to reference new baseline and mark as approved
  test.status = 'approved';
  test.baselineId = newBaseline.id;
  await baselineManager.saveTest(test);

  // Delete old baseline
  await baselineManager.deleteBaseline(test.baselineId);

  await refreshState();
  updateStatus('Test approved - baseline updated');
  logger.log('[VisualRegression] Test approved:', testId);
}

/**
 * Reject a test (mark as failed)
 */
export async function rejectTest(testId: string): Promise<void> {
  const test = currentState.tests.find((t) => t.id === testId);
  if (!test) {
    throw new Error('Test not found');
  }

  test.status = 'failed';
  await baselineManager.saveTest(test);
  await refreshState();

  updateStatus('Test rejected');
  logger.log('[VisualRegression] Test rejected:', testId);
}

/**
 * Delete a baseline
 */
export async function deleteBaseline(baselineId: string): Promise<void> {
  await baselineManager.deleteBaseline(baselineId);
  await refreshState();
  updateStatus('Baseline deleted');
}

/**
 * Delete a test
 */
export async function deleteTest(testId: string): Promise<void> {
  await baselineManager.deleteTest(testId);
  await refreshState();
  updateStatus('Test deleted');
}

// ============================================
// Ignore Regions
// ============================================

/**
 * Add an ignore region
 */
export function addIgnoreRegion(region: IgnoreRegion): void {
  currentState.ignoreRegions.push(region);
  updateSettingsUI();
}

/**
 * Remove an ignore region
 */
export function removeIgnoreRegion(index: number): void {
  currentState.ignoreRegions.splice(index, 1);
  updateSettingsUI();
}

/**
 * Clear all ignore regions
 */
export function clearIgnoreRegions(): void {
  currentState.ignoreRegions = [];
  updateSettingsUI();
}

// ============================================
// Export
// ============================================

/**
 * Export diff image
 */
export async function exportDiffImage(testId: string): Promise<void> {
  const test = currentState.tests.find((t) => t.id === testId);
  if (!test) {
    throw new Error('Test not found');
  }

  await exportDiffImageInternal(test);
}

/**
 * Export all data
 */
export async function exportAllData(): Promise<void> {
  const data = await baselineManager.exportData();
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `visual-regression-data-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  updateStatus('Data exported');
}

/**
 * Import data
 */
export async function importData(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text);

  // Validate with Zod schema for security
  const result = visualRegressionExportSchema.safeParse(parsed);
  if (!result.success) {
    logger.error('[VisualRegression] Invalid import data:', result.error);
    updateStatus('Import failed: Invalid data format');
    throw new Error('Invalid import data format');
  }

  await baselineManager.importData(result.data.data);
  await refreshState();
  updateStatus('Data imported');
}

// ============================================
// State Management
// ============================================

async function loadState(): Promise<void> {
  currentState = await baselineManager.getState();
  renderBaselines();
  renderTests();
  updateSettingsUI();
}

async function refreshState(): Promise<void> {
  await loadState();
}

// ============================================
// UI Panel
// ============================================

function createPanel(): void {
  if (panelContainer) return;

  panelContainer = document.createElement('div');
  panelContainer.id = `${PREFIX}-container`;
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 500px;
    max-height: 85vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = getPanelHTML();
  shadowRoot.appendChild(panel);

  setupEventListeners(panel);

  document.body.appendChild(panelContainer);
  isPanelOpen = true;

  // Initial load
  loadState();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  isPanelOpen = false;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Settings button
  panel.querySelector(`#${PREFIX}-settings`)?.addEventListener('click', toggleSettings);

  // Export button
  panel.querySelector(`#${PREFIX}-export`)?.addEventListener('click', () => {
    const dropdown = document.createElement('div');
    dropdown.className = `${PREFIX}-dropdown`;
    dropdown.innerHTML = renderExportDropdown(PREFIX);

    const actions = panel.querySelector(`#${PREFIX}-actions`);
    actions?.appendChild(dropdown);

    dropdown.querySelector(`#${PREFIX}-export-data`)?.addEventListener('click', () => {
      exportAllData();
      dropdown.remove();
    });

    dropdown.querySelector(`#${PREFIX}-import-data`)?.addEventListener('click', () => {
      panel.querySelector<HTMLInputElement>(`#${PREFIX}-import-input`)?.click();
      dropdown.remove();
    });

    // Close dropdown on click outside
    setTimeout(() => {
      document.addEventListener('click', function closeDropdown(e) {
        if (!dropdown.contains(e.target as Node)) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
        }
      });
    }, 10);
  });

  // Tab switching
  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as 'baselines' | 'tests';
      switchTab(tabName);
    });
  });

  // Capture buttons
  panel.querySelector(`#${PREFIX}-capture-viewport`)?.addEventListener('click', () => {
    createBaseline({ fullPage: false });
  });

  panel.querySelector(`#${PREFIX}-capture-full`)?.addEventListener('click', () => {
    createBaseline({ fullPage: true });
  });

  // Test buttons
  panel.querySelector(`#${PREFIX}-run-test`)?.addEventListener('click', () => {
    if (selectedBaselineId) {
      runTest(selectedBaselineId);
    }
  });

  panel.querySelector(`#${PREFIX}-run-batch`)?.addEventListener('click', () => {
    runBatchTests();
  });

  // Threshold slider
  panel.querySelector(`#${PREFIX}-threshold`)?.addEventListener('input', (e) => {
    const value = Number.parseFloat((e.target as HTMLInputElement).value);
    setThreshold(value);
  });

  // Clear regions
  panel.querySelector(`#${PREFIX}-clear-regions`)?.addEventListener('click', () => {
    clearIgnoreRegions();
  });

  // Import file
  panel.querySelector(`#${PREFIX}-import-input`)?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      importData(file);
    }
  });
}

function switchTab(tab: 'baselines' | 'tests'): void {
  shadowRoot?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  shadowRoot?.querySelectorAll(`.${PREFIX}-panel`).forEach((p) => {
    p.classList.toggle('active', p.id === `${PREFIX}-${tab}-panel`);
  });
}

function toggleSettings(): void {
  const settingsPanel = shadowRoot?.querySelector(`#${PREFIX}-settings-panel`);
  const contentPanel = shadowRoot?.querySelector(`#${PREFIX}-content`);

  if (settingsPanel?.classList.contains('hidden')) {
    settingsPanel.classList.remove('hidden');
    contentPanel?.classList.add('hidden');
  } else {
    settingsPanel?.classList.add('hidden');
    contentPanel?.classList.remove('hidden');
  }
}

function renderBaselines(): void {
  const list = shadowRoot?.querySelector(`#${PREFIX}-baselines-list`);
  if (!list) return;

  const baselines = currentState.baselines.filter((b) => b.url === window.location.href);

  updateBadge('baseline', baselines.length);

  if (baselines.length === 0) {
    list.innerHTML = renderEmptyState('No baselines for this page. Click "Capture" to create one.');
    return;
  }

  list.innerHTML = baselines
    .map((baseline) => {
      const date = new Date(baseline.timestamp).toLocaleString();
      const isSelected = baseline.id === selectedBaselineId;

      return renderBaselineItem(
        baseline.id,
        baseline.screenshot,
        date,
        baseline.viewport,
        isSelected
      );
    })
    .join('');

  // Add event listeners
  list.querySelectorAll(`.${PREFIX}-select-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) {
        selectedBaselineId = id;
        renderBaselines();
        updateTestButton();
      }
    });
  });

  list.querySelectorAll(`.${PREFIX}-delete-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id && confirm('Delete this baseline?')) {
        deleteBaseline(id);
      }
    });
  });
}

function renderTests(): void {
  const list = shadowRoot?.querySelector(`#${PREFIX}-tests-list`);
  if (!list) return;

  const tests = currentState.tests.filter((t) => t.url === window.location.href);

  updateBadge('test', tests.length);

  if (tests.length === 0) {
    list.innerHTML = renderEmptyState('No tests run yet. Select a baseline and click "Run Test".');
    return;
  }

  list.innerHTML = tests
    .map((test) => {
      const date = new Date(test.timestamp).toLocaleString();

      return renderTestItem(
        test.id,
        date,
        test.status,
        test.result.diffPercentage,
        test.result.diffImage
      );
    })
    .join('');

  // Add event listeners
  list.querySelectorAll(`.${PREFIX}-approve-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) approveTest(id);
    });
  });

  list.querySelectorAll(`.${PREFIX}-reject-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) rejectTest(id);
    });
  });

  list.querySelectorAll(`.${PREFIX}-export-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id) exportDiffImage(id);
    });
  });

  list.querySelectorAll(`.${PREFIX}-delete-btn`).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-id');
      if (id && confirm('Delete this test?')) {
        deleteTest(id);
      }
    });
  });
}

function updateTestButton(): void {
  const btn = shadowRoot?.querySelector<HTMLButtonElement>(`#${PREFIX}-run-test`);
  if (btn) {
    btn.disabled = !selectedBaselineId;
    btn.textContent = selectedBaselineId ? 'Run Test' : 'Select a Baseline';
  }
}

function updateSettingsUI(): void {
  const thresholdInput = shadowRoot?.querySelector<HTMLInputElement>(`#${PREFIX}-threshold`);
  const thresholdValue = shadowRoot?.querySelector(`#${PREFIX}-threshold-value`);

  if (thresholdInput) {
    thresholdInput.value = String(currentState.threshold);
  }
  if (thresholdValue) {
    thresholdValue.textContent = `${currentState.threshold}%`;
  }

  const regionsContainer = shadowRoot?.querySelector(`#${PREFIX}-ignore-regions`);
  if (regionsContainer) {
    if (currentState.ignoreRegions.length === 0) {
      regionsContainer.innerHTML = `<span class="${escapeHtml(PREFIX)}-empty-small">No ignore regions</span>`;
    } else {
      regionsContainer.innerHTML = currentState.ignoreRegions
        .map((region, index) => renderIgnoreRegionItem(index, region))
        .join('');

      regionsContainer.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = Number.parseInt(btn.getAttribute('data-index') || '0', 10);
          removeIgnoreRegion(index);
        });
      });
    }
  }
}

function updateBadge(type: BadgeType, count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

function updateStatus(message: string): void {
  const statusEl = shadowRoot?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, STATUS_TIMEOUT);
  }
}

// ============================================
// Export Module
// ============================================

export const visualRegression = {
  enable,
  disable,
  toggle,
  getState,
  setThreshold,
  createBaseline,
  runTest,
  runBatchTests,
  approveTest,
  rejectTest,
  deleteBaseline,
  deleteTest,
  addIgnoreRegion,
  removeIgnoreRegion,
  clearIgnoreRegions,
  exportDiffImage,
  exportAllData,
  importData,
};

export * from './capture';
export * from './comparison';
export * from './constants';
// Re-export types
export * from './types';
export * from './ui';
