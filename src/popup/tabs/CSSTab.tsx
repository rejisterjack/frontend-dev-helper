/**
 * CSS Tab
 */

import React from 'react';
import { FeatureToggle } from '@components/ui/FeatureToggle';
import type { FeatureToggles } from '@/types';

interface CSSTabProps {
  features: FeatureToggles | null;
  onToggleFeature: (feature: keyof FeatureToggles) => void;
}

export const CSSTab: React.FC<CSSTabProps> = ({ features, onToggleFeature }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          CSS Tools
        </h3>

        <FeatureToggle
          label="CSS Scanner"
          description="Scan and analyze CSS"
          enabled={features?.cssScanner ?? false}
          onChange={() => onToggleFeature('cssScanner')}
        />

        <FeatureToggle
          label="Unused CSS Detector"
          description="Find unused CSS rules"
          enabled={features?.unusedCssDetector ?? false}
          onChange={() => onToggleFeature('unusedCssDetector')}
        />

        <FeatureToggle
          label="Specificity Analyzer"
          description="Show selector specificity"
          enabled={features?.cssSpecificity ?? false}
          onChange={() => onToggleFeature('cssSpecificity')}
        />

        <FeatureToggle
          label="Animation Inspector"
          description="Inspect CSS animations"
          enabled={features?.animationInspector ?? false}
          onChange={() => onToggleFeature('animationInspector')}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Responsive Design
        </h3>

        <FeatureToggle
          label="Breakpoint Visualizer"
          description="Show current breakpoint"
          enabled={features?.breakpointVisualizer ?? false}
          onChange={() => onToggleFeature('breakpointVisualizer')}
        />

        <FeatureToggle
          label="Device Simulator"
          description="Simulate different devices"
          enabled={features?.deviceSimulator ?? false}
          onChange={() => onToggleFeature('deviceSimulator')}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Utilities
        </h3>

        <FeatureToggle
          label="Color Picker"
          description="Pick colors from the page"
          enabled={features?.colorPicker ?? false}
          onChange={() => onToggleFeature('colorPicker')}
        />

        <FeatureToggle
          label="Font Inspector"
          description="Inspect fonts and typography"
          enabled={features?.fontInspector ?? false}
          onChange={() => onToggleFeature('fontInspector')}
        />
      </div>
    </div>
  );
};
