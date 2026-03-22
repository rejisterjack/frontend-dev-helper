/**
 * FeatureToggle Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

interface FeatureToggleProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  description?: string;
}

function FeatureToggle({ label, enabled, onToggle, description }: FeatureToggleProps): React.ReactElement {
  return (
    <div className="feature-toggle">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{label}</h3>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
          aria-pressed={enabled}
          aria-label={`Toggle ${label}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

describe('FeatureToggle Component', () => {
  const mockToggle = vi.fn();

  beforeEach(() => {
    mockToggle.mockClear();
  });

  it('renders with label', () => {
    render(<FeatureToggle label="Test Feature" enabled={false} onToggle={mockToggle} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('shows enabled state', () => {
    render(<FeatureToggle label="Test Feature" enabled={true} onToggle={mockToggle} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle when clicked', () => {
    render(<FeatureToggle label="Test Feature" enabled={false} onToggle={mockToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
