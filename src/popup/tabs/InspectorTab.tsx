/**
 * Inspector Tab
 */

import { FeatureToggle } from '@components/ui/FeatureToggle';
import type React from 'react';
import type { FeatureToggles } from '@/types';

interface InspectorTabProps {
  features?: FeatureToggles | null;
  onToggleFeature?: (feature: keyof FeatureToggles) => void;
}

export const InspectorTab: React.FC<InspectorTabProps> = ({ features, onToggleFeature }) => {
  const handleInspectClick = async (): Promise<void> => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_INSPECTOR',
      });
      window.close();
    } catch (error) {
      // Silently fail if content script not available (e.g., on chrome:// pages)
      console.error('Failed to toggle inspector:', error);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-lg bg-dev-surface p-3">
        <button
          type="button"
          onClick={handleInspectClick}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-3 font-medium text-white transition-colors hover:bg-primary-700"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          Inspect Element
        </button>
        <p className="mt-2 text-center text-xs text-dev-muted">
          Click to start inspecting elements on the page
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">Features</h3>

        <FeatureToggle
          label="Element Inspector"
          description="Hover to inspect elements"
          enabled={features?.elementInspector ?? false}
          onChange={() => onToggleFeature?.('elementInspector' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="CSS Scanner"
          description="Scan and highlight CSS issues"
          enabled={features?.cssScanner ?? false}
          onChange={() => onToggleFeature?.('cssScanner' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Grid Overlay"
          description="Visualize grid and box model"
          enabled={features?.gridOverlay ?? false}
          onChange={() => onToggleFeature?.('gridOverlay' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Measure Tool"
          description="Measure distances on the page"
          enabled={features?.measurementTool ?? false}
          onChange={() => onToggleFeature?.('measurementTool' as keyof FeatureToggles)}
        />
      </div>

      <div className="rounded-lg border border-dev-border p-3">
        <div className="flex items-center gap-2 text-xs text-dev-muted">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Press <kbd className="rounded bg-dev-border px-1">Esc</kbd> to exit inspection mode
        </div>
      </div>
    </div>
  );
};
