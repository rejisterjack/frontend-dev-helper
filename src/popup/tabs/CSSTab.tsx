/**
 * CSS Tab
 */

import { FeatureToggle } from '@components/ui/FeatureToggle';
import type React from 'react';
import type { FeatureToggles } from '@/types';

interface CSSTabProps {
  features: FeatureToggles | null;
  onToggleFeature: (feature: keyof FeatureToggles) => void;
}

export const CSSTab: React.FC<CSSTabProps> = ({ features, onToggleFeature }) => {
  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">CSS Tools</h3>

        <FeatureToggle
          label="CSS Scanner"
          description="Scan and analyze CSS"
          enabled={features?.cssScanner ?? false}
          onChange={() => onToggleFeature('cssScanner' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Spacing Visualizer"
          description="Visualize element spacing and margins"
          enabled={features?.spacingVisualizer ?? false}
          onChange={() => onToggleFeature('spacingVisualizer' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Pixel Ruler"
          description="Measure pixel-precise dimensions"
          enabled={features?.pixelRuler ?? false}
          onChange={() => onToggleFeature('pixelRuler' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Measure Tool"
          description="Measure distances on the page"
          enabled={features?.measurementTool ?? false}
          onChange={() => onToggleFeature('measurementTool' as keyof FeatureToggles)}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Responsive Design
        </h3>

        <FeatureToggle
          label="Breakpoint Visualizer"
          description="Show current breakpoint"
          enabled={features?.responsiveBreakpoint ?? false}
          onChange={() => onToggleFeature('responsiveBreakpoint' as keyof FeatureToggles)}
        />

        <FeatureToggle
          label="Breakpoint Overlay"
          description="Show active responsive breakpoints"
          enabled={features?.responsiveBreakpoint ?? false}
          onChange={() => onToggleFeature('responsiveBreakpoint' as keyof FeatureToggles)}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">Utilities</h3>

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
