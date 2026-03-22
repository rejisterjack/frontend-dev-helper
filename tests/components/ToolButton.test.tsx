/**
 * ToolButton Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

interface ToolButtonProps {
  name: string;
  icon: string;
  enabled: boolean;
  onClick: () => void;
}

function ToolButton({ name, icon, enabled, onClick }: ToolButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tool-button ${enabled ? 'enabled' : ''}`}
      aria-pressed={enabled}
      title={name}
    >
      <span className="icon">{icon}</span>
      <span className="name">{name}</span>
    </button>
  );
}

describe('ToolButton Component', () => {
  const mockClick = vi.fn();

  it('renders with icon and name', () => {
    render(<ToolButton name="Pesticide" icon="🐞" enabled={false} onClick={mockClick} />);

    expect(screen.getByText('🐞')).toBeInTheDocument();
    expect(screen.getByText('Pesticide')).toBeInTheDocument();
  });

  it('has enabled class when enabled', () => {
    render(<ToolButton name="Pesticide" icon="🐞" enabled={true} onClick={mockClick} />);

    expect(screen.getByRole('button')).toHaveClass('enabled');
  });

  it('calls onClick when clicked', () => {
    render(<ToolButton name="Pesticide" icon="🐞" enabled={false} onClick={mockClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-pressed state', () => {
    render(<ToolButton name="Pesticide" icon="🐞" enabled={true} onClick={mockClick} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
