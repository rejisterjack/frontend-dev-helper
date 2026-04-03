/**
 * Visual Regression Component
 *
 * React component for visual regression testing UI.
 * Provides a comprehensive interface for:
 * - Managing baseline screenshots
 * - Running visual tests
 * - Viewing diff results
 * - Configuring settings
 */

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BaselineScreenshot, VisualRegressionState, VisualRegressionTest } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

interface VisualRegressionProps {
  /** Whether the component is visible */
  isOpen: boolean;
  /** Callback when component is closed */
  onClose: () => void;
  /** Current URL being tested */
  currentUrl?: string;
  /** Optional initial state */
  initialState?: Partial<VisualRegressionState>;
}

interface MessageResponse {
  success?: boolean;
  state?: VisualRegressionState;
  baseline?: BaselineScreenshot;
  test?: VisualRegressionTest;
  data?: {
    baselines: BaselineScreenshot[];
    tests: VisualRegressionTest[];
    exportedAt: number;
  };
}

// ============================================
// Constants
// ============================================

const DEFAULT_THRESHOLD = 0.1;
const TAB_BASELINES = 'baselines';
const TAB_TESTS = 'tests';
const TAB_SETTINGS = 'settings';

// ============================================
// Component
// ============================================

export const VisualRegression: React.FC<VisualRegressionProps> = ({
  isOpen,
  onClose,
  currentUrl = window.location.href,
  initialState,
}) => {
  // State
  const [activeTab, setActiveTab] = useState(TAB_BASELINES);
  const [baselines, setBaselines] = useState<BaselineScreenshot[]>([]);
  const [tests, setTests] = useState<VisualRegressionTest[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(initialState?.threshold ?? DEFAULT_THRESHOLD);
  const [ignoreRegions, setIgnoreRegions] = useState(initialState?.ignoreRegions ?? []);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{
    test: VisualRegressionTest;
    baseline: BaselineScreenshot;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // Load Initial Data
  // ============================================

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = useCallback(async () => {
    try {
      // Load from IndexedDB via message to content script
      const response = (await sendMessageToContentScript({
        type: 'VISUAL_REGRESSION_GET_STATE',
      })) as MessageResponse;

      if (response?.state) {
        setBaselines(response.state.baselines || []);
        setTests(response.state.tests || []);
        if (response.state.threshold) {
          setThreshold(response.state.threshold);
        }
        if (response.state.ignoreRegions) {
          setIgnoreRegions(response.state.ignoreRegions);
        }
      }
    } catch (error) {
      logger.error('[VisualRegression] Failed to load data:', error);
    }
  }, []);

  // ============================================
  // Baseline Operations
  // ============================================

  const captureBaseline = useCallback(
    async (options: { fullPage?: boolean; name?: string } = {}) => {
      setIsCapturing(true);
      try {
        const response = (await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_CAPTURE_BASELINE',
          options,
        })) as MessageResponse;

        const baseline = response?.baseline;
        if (baseline) {
          setBaselines((prev) => [baseline, ...prev]);
          setSelectedBaselineId(baseline.id);
          logger.log('[VisualRegression] Baseline captured:', baseline.id);
        }
      } catch (error) {
        logger.error('[VisualRegression] Failed to capture baseline:', error);
      } finally {
        setIsCapturing(false);
      }
    },
    []
  );

  const deleteBaseline = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this baseline?')) return;

      try {
        await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_DELETE_BASELINE',
          id,
        });

        setBaselines((prev) => prev.filter((b) => b.id !== id));
        setTests((prev) => prev.filter((t) => t.baselineId !== id));

        if (selectedBaselineId === id) {
          setSelectedBaselineId(null);
        }
      } catch (error) {
        logger.error('[VisualRegression] Failed to delete baseline:', error);
      }
    },
    [selectedBaselineId]
  );

  // ============================================
  // Test Operations
  // ============================================

  const runTest = useCallback(
    async (baselineId: string) => {
      const baseline = baselines.find((b) => b.id === baselineId);
      if (!baseline) return;

      setIsComparing(true);
      try {
        const response = (await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_RUN_TEST',
          baselineId,
          options: {
            threshold,
            ignoreRegions,
          },
        })) as MessageResponse;

        const testResult = response?.test;
        if (testResult) {
          setTests((prev) => [testResult, ...prev]);
          setComparisonResult({
            test: testResult,
            baseline,
          });
          setActiveTab(TAB_TESTS);
          logger.log('[VisualRegression] Test completed:', testResult.status);
        }
      } catch (error) {
        logger.error('[VisualRegression] Test failed:', error);
      } finally {
        setIsComparing(false);
      }
    },
    [baselines, threshold, ignoreRegions]
  );

  const runBatchTests = useCallback(async () => {
    const urlBaselines = baselines.filter((b) => b.url === currentUrl);
    if (urlBaselines.length === 0) {
      alert('No baselines found for current page');
      return;
    }

    setIsComparing(true);
    const results: VisualRegressionTest[] = [];

    for (const baseline of urlBaselines) {
      try {
        const response = await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_RUN_TEST',
          baselineId: baseline.id,
          options: {
            threshold,
            ignoreRegions,
          },
        });

        if (response?.test) {
          results.push(response.test);
        }
      } catch (error) {
        logger.error('[VisualRegression] Test failed for baseline:', baseline.id, error);
      }
    }

    setTests((prev) => [...results, ...prev]);
    setIsComparing(false);
    setActiveTab(TAB_TESTS);

    const passed = results.filter((r) => r.status === 'passed').length;
    logger.log(`[VisualRegression] Batch complete: ${passed}/${results.length} passed`);
  }, [baselines, currentUrl, threshold, ignoreRegions]);

  const approveTest = useCallback(async (testId: string) => {
    try {
      const response = await sendMessageToContentScript({
        type: 'VISUAL_REGRESSION_APPROVE_TEST',
        testId,
      });

      if (response?.test) {
        setTests((prev) =>
          prev.map((t) => (t.id === testId ? { ...t, status: 'approved' as const } : t))
        );
        logger.log('[VisualRegression] Test approved:', testId);
      }
    } catch (error) {
      logger.error('[VisualRegression] Failed to approve test:', error);
    }
  }, []);

  const rejectTest = useCallback(async (testId: string) => {
    try {
      await sendMessageToContentScript({
        type: 'VISUAL_REGRESSION_REJECT_TEST',
        testId,
      });

      setTests((prev) =>
        prev.map((t) => (t.id === testId ? { ...t, status: 'failed' as const } : t))
      );
    } catch (error) {
      logger.error('[VisualRegression] Failed to reject test:', error);
    }
  }, []);

  const deleteTest = useCallback(
    async (testId: string) => {
      if (!confirm('Are you sure you want to delete this test?')) return;

      try {
        await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_DELETE_TEST',
          testId,
        });

        setTests((prev) => prev.filter((t) => t.id !== testId));
        if (comparisonResult?.test.id === testId) {
          setComparisonResult(null);
        }
      } catch (error) {
        logger.error('[VisualRegression] Failed to delete test:', error);
      }
    },
    [comparisonResult]
  );

  // ============================================
  // Settings
  // ============================================

  const handleThresholdChange = useCallback((value: number) => {
    setThreshold(value);
    saveSettings({ threshold: value });
  }, []);

  const addIgnoreRegion = useCallback(
    (region: { x: number; y: number; width: number; height: number }) => {
      const newRegions = [...ignoreRegions, region];
      setIgnoreRegions(newRegions);
      saveSettings({ ignoreRegions: newRegions });
    },
    [ignoreRegions]
  );

  const removeIgnoreRegion = useCallback(
    (index: number) => {
      const newRegions = ignoreRegions.filter((_, i) => i !== index);
      setIgnoreRegions(newRegions);
      saveSettings({ ignoreRegions: newRegions });
    },
    [ignoreRegions]
  );

  const saveSettings = useCallback(async (settings: Partial<VisualRegressionState>) => {
    try {
      await sendMessageToContentScript({
        type: 'VISUAL_REGRESSION_UPDATE_SETTINGS',
        settings,
      });
    } catch (error) {
      logger.error('[VisualRegression] Failed to save settings:', error);
    }
  }, []);

  // ============================================
  // Import/Export
  // ============================================

  const exportData = useCallback(async () => {
    try {
      const response = (await sendMessageToContentScript({
        type: 'VISUAL_REGRESSION_EXPORT',
      })) as MessageResponse;

      if (response?.data) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `visual-regression-${Date.now()}.json`;
        link.click();

        URL.revokeObjectURL(url);
        logger.log('[VisualRegression] Data exported');
      }
    } catch (error) {
      logger.error('[VisualRegression] Export failed:', error);
    }
  }, []);

  const importData = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const response = (await sendMessageToContentScript({
          type: 'VISUAL_REGRESSION_IMPORT',
          data,
        })) as MessageResponse;

        if (response?.success) {
          await loadData();
          logger.log('[VisualRegression] Data imported');
        }
      } catch (error) {
        logger.error('[VisualRegression] Import failed:', error);
        alert('Failed to import data. Please check the file format.');
      }
    },
    [loadData]
  );

  const exportDiffImage = useCallback((test: VisualRegressionTest) => {
    if (!test.result.diffImage) return;

    const link = document.createElement('a');
    link.href = test.result.diffImage;
    link.download = `diff-${test.id}-${Date.now()}.png`;
    link.click();
  }, []);

  // ============================================
  // Helpers
  // ============================================

  const sendMessageToContentScript = async (message: unknown): Promise<MessageResponse> => {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(message, (response: MessageResponse) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      } else {
        // For testing without extension context
        reject(new Error('Extension context not available'));
      }
    });
  };

  // ============================================
  // Filter data for current URL
  // ============================================

  const urlBaselines = baselines.filter((b) => b.url === currentUrl);
  const urlTests = tests.filter((t) => t.url === currentUrl);

  // ============================================
  // Render
  // ============================================

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[2147483647] flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📸</span>
            <h2 className="text-lg font-semibold text-white">Visual Regression Testing</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportData}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white"
              title="Export Data"
            >
              📤 Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600 hover:text-white"
              title="Import Data"
            >
              📥 Import
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800">
          {[
            { id: TAB_BASELINES, label: 'Baselines', count: urlBaselines.length },
            { id: TAB_TESTS, label: 'Tests', count: urlTests.length },
            { id: TAB_SETTINGS, label: 'Settings' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Baselines Tab */}
          {activeTab === TAB_BASELINES && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => captureBaseline({ fullPage: false })}
                  disabled={isCapturing}
                  className="
                    flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2
                    text-sm font-medium text-white
                    hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-600
                  "
                >
                  {isCapturing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Capturing...
                    </>
                  ) : (
                    <>📷 Capture Viewport</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => captureBaseline({ fullPage: true })}
                  disabled={isCapturing}
                  className="
                    flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2
                    text-sm font-medium text-slate-200
                    hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-600
                  "
                >
                  📄 Capture Full Page
                </button>
              </div>

              {/* Baselines Grid */}
              {urlBaselines.length === 0 ? (
                <div className="rounded-lg bg-slate-800/50 py-12 text-center">
                  <div className="mb-3 text-4xl">📸</div>
                  <p className="text-slate-400">No baselines for this page yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Capture a screenshot to create your first baseline. Baselines are keyed by this page&apos;s
                    URL (hash ignored) so the same path in another environment stays separate.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {urlBaselines.map((baseline) => (
                    <div
                      key={baseline.id}
                      className={`
                        group rounded-lg border-2 bg-slate-800 p-3 transition-all
                        ${
                          selectedBaselineId === baseline.id
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }
                      `}
                    >
                      {/* Preview */}
                      <div className="relative mb-3 aspect-video overflow-hidden rounded bg-slate-900">
                        <img
                          src={baseline.screenshot}
                          alt="Baseline"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedBaselineId(
                                selectedBaselineId === baseline.id ? null : baseline.id
                              )
                            }
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                          >
                            {selectedBaselineId === baseline.id ? 'Deselect' : 'Select'}
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="mb-3">
                        <div className="text-sm font-medium text-white">
                          {new Date(baseline.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {baseline.viewport.width}×{baseline.viewport.height} @{' '}
                          {baseline.devicePixelRatio}x
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => runTest(baseline.id)}
                          disabled={isComparing}
                          className="flex-1 rounded bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:bg-slate-600"
                        >
                          {isComparing ? 'Running...' : 'Run Test'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBaseline(baseline.id)}
                          className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-red-600 hover:text-white"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === TAB_TESTS && (
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => selectedBaselineId && runTest(selectedBaselineId)}
                  disabled={!selectedBaselineId || isComparing}
                  className="
                    flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2
                    text-sm font-medium text-white
                    hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-600
                  "
                >
                  {isComparing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Running...
                    </>
                  ) : (
                    <>▶️ Run Selected Test</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={runBatchTests}
                  disabled={isComparing || urlBaselines.length === 0}
                  className="
                    flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2
                    text-sm font-medium text-slate-200
                    hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-600
                  "
                >
                  🔄 Run Batch ({urlBaselines.length})
                </button>
              </div>

              {/* Comparison Result */}
              {comparisonResult && (
                <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">Latest Comparison</h3>
                      <p className="text-sm text-slate-400">
                        Diff: {comparisonResult.test.result.diffPercentage.toFixed(2)}%
                      </p>
                    </div>
                    <span
                      className={`
                        rounded-full px-3 py-1 text-sm font-medium
                        ${
                          comparisonResult.test.status === 'passed' ||
                          comparisonResult.test.status === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }
                      `}
                    >
                      {comparisonResult.test.status === 'passed'
                        ? '✓ Passed'
                        : comparisonResult.test.status === 'approved'
                          ? '✓✓ Approved'
                          : '✗ Failed'}
                    </span>
                  </div>

                  {comparisonResult.test.result.diffImage && (
                    <div className="aspect-video overflow-hidden rounded bg-slate-900">
                      <img
                        src={comparisonResult.test.result.diffImage}
                        alt="Diff"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tests List */}
              {urlTests.length === 0 ? (
                <div className="rounded-lg bg-slate-800/50 py-12 text-center">
                  <div className="mb-3 text-4xl">🔍</div>
                  <p className="text-slate-400">No tests run yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a baseline and run a test to compare screenshots
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urlTests.map((test) => (
                    <div
                      key={test.id}
                      className={`
                        rounded-lg border-l-4 bg-slate-800 p-4
                        ${
                          test.status === 'passed' || test.status === 'approved'
                            ? 'border-green-500'
                            : 'border-red-500'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <span
                              className={`
                                rounded-full px-2 py-0.5 text-xs font-medium
                                ${
                                  test.status === 'passed' || test.status === 'approved'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }
                              `}
                            >
                              {test.status.toUpperCase()}
                            </span>
                            <span className="text-sm text-slate-400">
                              {new Date(test.timestamp).toLocaleString()}
                            </span>
                            <span className="text-sm text-slate-500">
                              Diff: {test.result.diffPercentage.toFixed(2)}%
                            </span>
                          </div>

                          {test.result.diffImage && (
                            <div className="mb-3 aspect-video max-w-md overflow-hidden rounded bg-slate-900">
                              <img
                                src={test.result.diffImage}
                                alt="Diff"
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {test.status === 'failed' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approveTest(test.id)}
                                  className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500"
                                >
                                  ✓ Approve as New Baseline
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectTest(test.id)}
                                  className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
                                >
                                  ✗ Reject
                                </button>
                              </>
                            )}
                            {test.result.diffImage && (
                              <button
                                type="button"
                                onClick={() => exportDiffImage(test)}
                                className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
                              >
                                📥 Export Diff
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteTest(test.id)}
                              className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-red-600 hover:text-white"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === TAB_SETTINGS && (
            <div className="space-y-6">
              {/* Threshold */}
              <div>
                <label
                  htmlFor="threshold-slider"
                  className="mb-2 block text-sm font-medium text-white"
                >
                  Difference Threshold: {threshold}%
                </label>
                <input
                  id="threshold-slider"
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-indigo-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Maximum percentage of pixels that can differ before a test fails
                </p>
              </div>

              {/* Ignore Regions */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Ignore Regions</span>
                  <button
                    type="button"
                    onClick={() =>
                      addIgnoreRegion({
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                      })
                    }
                    className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    + Add Region
                  </button>
                </div>

                {ignoreRegions.length === 0 ? (
                  <p className="text-sm text-slate-500">No ignore regions defined</p>
                ) : (
                  <div className="space-y-2">
                    {ignoreRegions.map((region, idx) => (
                      <div
                        key={`${region.x}-${region.y}-${region.width}-${region.height}`}
                        className="flex items-center gap-3 rounded-lg bg-slate-800 p-3"
                      >
                        <div className="flex-1 text-sm text-slate-300">
                          x: {region.x}, y: {region.y}, {region.width}×{region.height}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeIgnoreRegion(idx)}
                          className="rounded bg-slate-700 p-1.5 text-slate-400 hover:bg-red-600 hover:text-white"
                        >
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="rounded-lg bg-slate-800 p-4">
                <h4 className="mb-3 text-sm font-medium text-white">Statistics</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded bg-slate-700/50 p-3 text-center">
                    <div className="text-2xl font-bold text-white">{baselines.length}</div>
                    <div className="text-xs text-slate-400">Total Baselines</div>
                  </div>
                  <div className="rounded bg-slate-700/50 p-3 text-center">
                    <div className="text-2xl font-bold text-white">{tests.length}</div>
                    <div className="text-xs text-slate-400">Total Tests</div>
                  </div>
                  <div className="rounded bg-slate-700/50 p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {tests.filter((t) => t.status === 'passed' || t.status === 'approved').length}
                    </div>
                    <div className="text-xs text-slate-400">Passed</div>
                  </div>
                  <div className="rounded bg-slate-700/50 p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {tests.filter((t) => t.status === 'failed').length}
                    </div>
                    <div className="text-xs text-slate-400">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-700 bg-slate-800 px-6 py-3">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{urlBaselines.length} baselines</span>
            <span>•</span>
            <span>{urlTests.length} tests</span>
          </div>
          <div className="text-xs text-slate-500">FrontendDevHelper Visual Regression</div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importData(file);
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default VisualRegression;
