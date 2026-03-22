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

import type {
  BaselineScreenshot,
  VisualRegressionState,
  VisualRegressionTest,
} from '@/types';
import { logger } from '@/utils/logger';
import { baselineManager } from './visual-regression/baseline-manager';
import { diffEngine } from './visual-regression/diff-engine';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-visual-regression';
const DEFAULT_THRESHOLD = 0.1;

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

/**
 * Capture a screenshot of the current viewport
 */
export async function captureViewportScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: window.devicePixelRatio,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Capture a full page screenshot
 */
export async function captureFullPageScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.documentElement, {
    x: 0,
    y: 0,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    scale: window.devicePixelRatio,
    useCORS: true,
    logging: false,
  });

  return canvas.toDataURL('image/png');
}

/**
 * Create a baseline screenshot
 */
export async function createBaseline(
  options: {
    fullPage?: boolean;
    name?: string;
  } = {}
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

  const baseline = await baselineManager.getBaseline(baselineId);
  if (!baseline) {
    throw new Error('Baseline not found');
  }

  isCapturing = true;
  updateStatus('Running test...');

  try {
    // Capture current screenshot
    const currentScreenshot = await captureViewportScreenshot();

    // Compare with baseline
    const diffResult = await diffEngine.compareScreenshots(
      baseline.screenshot,
      currentScreenshot,
      {
        threshold: currentState.threshold,
        ignoreRegions: currentState.ignoreRegions,
        generateDiffImage: true,
      }
    );

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
    await refreshState();

    updateStatus(diffResult.match ? 'Test passed' : 'Test failed');
    logger.log(
      '[VisualRegression] Test completed:',
      test.id,
      diffResult.match ? 'PASSED' : 'FAILED'
    );

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

  updateStatus(`Batch complete: ${results.filter((r) => r.status === 'passed').length}/${results.length} passed`);
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
export function addIgnoreRegion(
  region: { x: number; y: number; width: number; height: number }
): void {
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
  if (!test || !test.result.diffImage) {
    throw new Error('Diff image not found');
  }

  await diffEngine.exportDiffImage(
    test.result.diffImage,
    `diff-${testId}-${Date.now()}.png`
  );
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
  const data = JSON.parse(text);
  await baselineManager.importData(data);
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

function getPanelHTML(): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>📸</span>
        <span>Visual Regression</span>
      </div>
      <div id="${PREFIX}-actions">
        <button id="${PREFIX}-settings" title="Settings">⚙️</button>
        <button id="${PREFIX}-export" title="Export All">📤</button>
        <button id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-tabs">
      <button class="${PREFIX}-tab active" data-tab="baselines">
        Baselines
        <span class="${PREFIX}-badge" id="${PREFIX}-baseline-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="tests">
        Tests
        <span class="${PREFIX}-badge" id="${PREFIX}-test-count">0</span>
      </button>
    </div>
    
    <div id="${PREFIX}-content">
      <div id="${PREFIX}-baselines-panel" class="${PREFIX}-panel active">
        <div class="${PREFIX}-toolbar">
          <button id="${PREFIX}-capture-viewport" class="${PREFIX}-btn-primary">Capture Viewport</button>
          <button id="${PREFIX}-capture-full" class="${PREFIX}-btn-secondary">Capture Full Page</button>
        </div>
        <div id="${PREFIX}-baselines-list" class="${PREFIX}-list"></div>
      </div>
      
      <div id="${PREFIX}-tests-panel" class="${PREFIX}-panel">
        <div class="${PREFIX}-toolbar">
          <button id="${PREFIX}-run-test" class="${PREFIX}-btn-primary" disabled>Run Test</button>
          <button id="${PREFIX}-run-batch" class="${PREFIX}-btn-secondary">Run Batch</button>
        </div>
        <div id="${PREFIX}-tests-list" class="${PREFIX}-list"></div>
      </div>
    </div>
    
    <div id="${PREFIX}-settings-panel" class="${PREFIX}-panel hidden">
      <div class="${PREFIX}-settings-section">
        <label>Threshold (%)</label>
        <input type="range" id="${PREFIX}-threshold" min="0" max="10" step="0.1" value="0.1">
        <span id="${PREFIX}-threshold-value">0.1%</span>
      </div>
      <div class="${PREFIX}-settings-section">
        <label>Ignore Regions</label>
        <div id="${PREFIX}-ignore-regions"></div>
        <button id="${PREFIX}-clear-regions" class="${PREFIX}-btn-secondary">Clear All</button>
      </div>
    </div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-status">Ready</span>
      <span id="${PREFIX}-info"></span>
    </div>
    
    <input type="file" id="${PREFIX}-import-input" accept=".json" style="display: none;">
  `;
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
    dropdown.innerHTML = `
      <button id="${PREFIX}-export-data">Export Data (JSON)</button>
      <button id="${PREFIX}-import-data">Import Data</button>
    `;
    
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
    const value = parseFloat((e.target as HTMLInputElement).value);
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

  const baselines = currentState.baselines.filter(
    (b) => b.url === window.location.href
  );

  updateBadge('baseline', baselines.length);

  if (baselines.length === 0) {
    list.innerHTML = `<div class="${PREFIX}-empty">No baselines for this page. Click "Capture" to create one.</div>`;
    return;
  }

  list.innerHTML = baselines
    .map((baseline) => {
      const date = new Date(baseline.timestamp).toLocaleString();
      const isSelected = baseline.id === selectedBaselineId;

      return `
        <div class="${PREFIX}-baseline ${isSelected ? 'selected' : ''}" data-id="${baseline.id}">
          <div class="${PREFIX}-baseline-preview">
            <img src="${baseline.screenshot}" alt="Baseline" loading="lazy">
          </div>
          <div class="${PREFIX}-baseline-info">
            <div class="${PREFIX}-baseline-date">${date}</div>
            <div class="${PREFIX}-baseline-meta">
              ${baseline.viewport.width}×${baseline.viewport.height}
            </div>
          </div>
          <div class="${PREFIX}-baseline-actions">
            <button class="${PREFIX}-select-btn" data-id="${baseline.id}">
              ${isSelected ? '✓' : 'Select'}
            </button>
            <button class="${PREFIX}-delete-btn" data-id="${baseline.id}">🗑️</button>
          </div>
        </div>
      `;
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

  const tests = currentState.tests.filter(
    (t) => t.url === window.location.href
  );

  updateBadge('test', tests.length);

  if (tests.length === 0) {
    list.innerHTML = `<div class="${PREFIX}-empty">No tests run yet. Select a baseline and click "Run Test".</div>`;
    return;
  }

  list.innerHTML = tests
    .map((test) => {
      const date = new Date(test.timestamp).toLocaleString();
      const statusClass = test.status === 'passed' || test.status === 'approved' ? 'passed' : 'failed';

      return `
        <div class="${PREFIX}-test ${statusClass}" data-id="${test.id}">
          <div class="${PREFIX}-test-header">
            <span class="${PREFIX}-test-status ${statusClass}">
              ${test.status === 'passed' ? '✓' : test.status === 'approved' ? '✓✓' : '✗'}
            </span>
            <span class="${PREFIX}-test-date">${date}</span>
            <span class="${PREFIX}-test-diff">${test.result.diffPercentage.toFixed(2)}%</span>
          </div>
          ${test.result.diffImage ? `
            <div class="${PREFIX}-test-preview">
              <img src="${test.result.diffImage}" alt="Diff" loading="lazy">
            </div>
          ` : ''}
          <div class="${PREFIX}-test-actions">
            ${test.status === 'failed' ? `
              <button class="${PREFIX}-approve-btn" data-id="${test.id}">Approve</button>
              <button class="${PREFIX}-reject-btn" data-id="${test.id}">Reject</button>
            ` : ''}
            ${test.result.diffImage ? `
              <button class="${PREFIX}-export-btn" data-id="${test.id}">Export</button>
            ` : ''}
            <button class="${PREFIX}-delete-btn" data-id="${test.id}">Delete</button>
          </div>
        </div>
      `;
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
      regionsContainer.innerHTML = `<span class="${PREFIX}-empty-small">No ignore regions</span>`;
    } else {
      regionsContainer.innerHTML = currentState.ignoreRegions
        .map(
          (region, index) => `
            <div class="${PREFIX}-region">
              <span>${region.x}, ${region.y} (${region.width}×${region.height})</span>
              <button data-index="${index}">Remove</button>
            </div>
          `
        )
        .join('');

      regionsContainer.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.getAttribute('data-index') || '0', 10);
          removeIgnoreRegion(index);
        });
      });
    }
  }
}

function updateBadge(type: 'baseline' | 'test', count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

function updateStatus(message: string): void {
  const statusEl = shadowRoot?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, 3000);
  }
}

// ============================================
// Styles
// ============================================

function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 85vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    }

    #${PREFIX}-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    #${PREFIX}-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    #${PREFIX}-actions {
      display: flex;
      gap: 4px;
      position: relative;
    }

    #${PREFIX}-actions button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    .${PREFIX}-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      z-index: 10;
    }

    .${PREFIX}-dropdown button {
      padding: 8px 12px;
      text-align: left;
      white-space: nowrap;
    }

    #${PREFIX}-tabs {
      display: flex;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    .${PREFIX}-tab {
      flex: 1;
      padding: 10px 12px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .${PREFIX}-tab:hover {
      color: #e2e8f0;
      background: #334155;
    }

    .${PREFIX}-tab.active {
      color: #f8fafc;
      background: #0f172a;
      border-bottom: 2px solid #4f46e5;
    }

    .${PREFIX}-badge {
      background: #334155;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      min-width: 18px;
      text-align: center;
    }

    #${PREFIX}-content {
      flex: 1;
      overflow-y: auto;
      min-height: 200px;
    }

    .${PREFIX}-panel {
      display: none;
      padding: 12px;
    }

    .${PREFIX}-panel.active {
      display: block;
    }

    .${PREFIX}-panel.hidden {
      display: none !important;
    }

    .${PREFIX}-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .${PREFIX}-btn-primary,
    .${PREFIX}-btn-secondary {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: background 0.15s;
    }

    .${PREFIX}-btn-primary {
      background: #4f46e5;
      color: white;
    }

    .${PREFIX}-btn-primary:hover:not(:disabled) {
      background: #4338ca;
    }

    .${PREFIX}-btn-primary:disabled {
      background: #475569;
      cursor: not-allowed;
    }

    .${PREFIX}-btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }

    .${PREFIX}-btn-secondary:hover {
      background: #475569;
    }

    .${PREFIX}-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .${PREFIX}-empty {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
      font-size: 13px;
    }

    .${PREFIX}-empty-small {
      color: #64748b;
      font-size: 12px;
    }

    .${PREFIX}-baseline,
    .${PREFIX}-test {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
      cursor: pointer;
    }

    .${PREFIX}-baseline:hover,
    .${PREFIX}-test:hover {
      border-color: #475569;
    }

    .${PREFIX}-baseline.selected {
      border-color: #4f46e5;
      background: #1e1b4b;
    }

    .${PREFIX}-test.passed {
      border-left: 3px solid #22c55e;
    }

    .${PREFIX}-test.failed {
      border-left: 3px solid #ef4444;
    }

    .${PREFIX}-baseline-preview,
    .${PREFIX}-test-preview {
      width: 100%;
      height: 120px;
      overflow: hidden;
      border-radius: 4px;
      margin-bottom: 8px;
      background: #0f172a;
    }

    .${PREFIX}-baseline-preview img,
    .${PREFIX}-test-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .${PREFIX}-baseline-info,
    .${PREFIX}-test-header {
      margin-bottom: 8px;
    }

    .${PREFIX}-baseline-date,
    .${PREFIX}-test-date {
      font-weight: 500;
      font-size: 12px;
    }

    .${PREFIX}-baseline-meta,
    .${PREFIX}-test-diff {
      font-size: 11px;
      color: #64748b;
    }

    .${PREFIX}-test-status {
      display: inline-block;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      text-align: center;
      line-height: 20px;
      font-size: 12px;
      margin-right: 8px;
    }

    .${PREFIX}-test-status.passed {
      background: #22c55e;
      color: white;
    }

    .${PREFIX}-test-status.failed {
      background: #ef4444;
      color: white;
    }

    .${PREFIX}-baseline-actions,
    .${PREFIX}-test-actions {
      display: flex;
      gap: 8px;
    }

    .${PREFIX}-baseline-actions button,
    .${PREFIX}-test-actions button {
      flex: 1;
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      background: #334155;
      color: #e2e8f0;
    }

    .${PREFIX}-baseline-actions button:hover,
    .${PREFIX}-test-actions button:hover {
      background: #475569;
    }

    .${PREFIX}-select-btn {
      background: #4f46e5 !important;
    }

    .${PREFIX}-approve-btn {
      background: #059669 !important;
    }

    .${PREFIX}-reject-btn {
      background: #dc2626 !important;
    }

    #${PREFIX}-settings-panel {
      padding: 16px;
    }

    .${PREFIX}-settings-section {
      margin-bottom: 16px;
    }

    .${PREFIX}-settings-section label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      font-size: 12px;
    }

    .${PREFIX}-settings-section input[type="range"] {
      width: 100%;
      margin-bottom: 4px;
    }

    .${PREFIX}-region {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #1e293b;
      border-radius: 4px;
      margin-bottom: 4px;
      font-size: 11px;
    }

    .${PREFIX}-region button {
      padding: 2px 8px;
      font-size: 10px;
      background: #475569;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      font-size: 11px;
      color: #64748b;
    }

    /* Scrollbar */
    #${PREFIX}-content::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}

// ============================================
// Utilities
// ============================================

function generateId(): string {
  return `vr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// html2canvas - Simplified version for screenshots
async function html2canvas(
  element: HTMLElement,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    useCORS: boolean;
    logging: boolean;
  }
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(options.width * options.scale);
  canvas.height = Math.floor(options.height * options.scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.scale(options.scale, options.scale);

  // Try to use native capture if available (Chrome extension API)
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_TAB',
        area: {
          x: Math.floor(options.x),
          y: Math.floor(options.y),
          width: Math.floor(options.width),
          height: Math.floor(options.height),
          scale: options.scale,
        },
      });

      if (response?.dataUrl) {
        const img = await loadImage(response.dataUrl);
        ctx.drawImage(img, 0, 0, options.width, options.height);
        return canvas;
      }
    } catch {
      // Fall back to DOM-based capture
    }
  }

  // DOM-based capture (simplified)
  ctx.fillStyle = getComputedStyle(element).backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, options.width, options.height);

  // Capture visible elements
  const elements = element.querySelectorAll('*');
  const promises: Promise<void>[] = [];

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const htmlEl = el as HTMLElement;
      const computed = getComputedStyle(htmlEl);

      // Skip invisible elements
      if (computed.display === 'none' || computed.visibility === 'hidden') {
        continue;
      }

      // Check if element is in capture area
      if (
        rect.right > options.x &&
        rect.bottom > options.y &&
        rect.left < options.x + options.width &&
        rect.top < options.y + options.height
      ) {
        const drawX = rect.left - options.x;
        const drawY = rect.top - options.y;

        // Draw background
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          ctx.fillStyle = computed.backgroundColor;
          ctx.fillRect(drawX, drawY, rect.width, rect.height);
        }

        // Draw images
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement;
          if (img.complete) {
            promises.push(
              new Promise((resolve) => {
                ctx.drawImage(img, drawX, drawY, rect.width, rect.height);
                resolve();
              })
            );
          }
        }

        // Draw text
        if (el.childNodes.length === 1 && el.firstChild?.nodeType === Node.TEXT_NODE) {
          const text = el.textContent || '';
          if (text.trim()) {
            ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
            ctx.fillStyle = computed.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text, drawX + Number.parseInt(computed.paddingLeft || '0', 10), drawY + Number.parseInt(computed.paddingTop || '0', 10));
          }
        }
      }
    }
  }

  await Promise.all(promises);
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
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
