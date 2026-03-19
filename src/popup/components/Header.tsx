/**
 * Popup Header Component
 */

import type React from 'react';

interface HeaderProps {
  enabled: boolean;
  onToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ enabled, onToggle }) => {
  return (
    <header className="flex items-center justify-between border-b border-dev-border bg-dev-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-dev-text">FrontendDevHelper</h1>
          <div className="flex items-center gap-1 text-xs text-dev-muted">
            <span
              className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-dev-success' : 'bg-dev-muted'}`}
            />
            {enabled ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`relative h-6 w-10 rounded-full transition-colors ${
          enabled ? 'bg-primary-600' : 'bg-dev-border'
        }`}
        aria-label={enabled ? 'Disable extension' : 'Enable extension'}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? 'left-5' : 'left-1'
          }`}
        />
      </button>
    </header>
  );
};
