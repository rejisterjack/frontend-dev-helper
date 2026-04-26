/**
 * Feature Toggle Component
 */

import type React from 'react';

interface FeatureToggleProps {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  label,
  description,
  enabled,
  onChange,
  disabled,
}) => {
  return (
    <div
      className={`box-border flex w-full min-w-0 max-w-full items-start justify-between gap-3 rounded-lg bg-dev-surface p-3 ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0 flex-1 pr-0">
        <div className="text-sm font-medium text-dev-text">{label}</div>
        {description && <div className="mt-0.5 text-xs text-dev-muted">{description}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-dev-border'
        } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? 'left-5' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
};
