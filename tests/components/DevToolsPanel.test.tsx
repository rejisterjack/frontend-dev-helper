/**
 * DevToolsPanel Component Tests
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

interface Tool {
  id: string;
  name: string;
  enabled: boolean;
}

interface DevToolsPanelProps {
  tools: Tool[];
  onToggle: (id: string) => void;
}

function DevToolsPanel({ tools, onToggle }: DevToolsPanelProps): React.ReactElement {
  return (
    <div data-testid="devtools-panel">
      <h2>Developer Tools</h2>
      <div className="tools-list">
        {tools.map((tool) => (
          <div key={tool.id} className="tool-item">
            <span>{tool.name}</span>
            <button
              type="button"
              onClick={() => onToggle(tool.id)}
              data-testid={`toggle-${tool.id}`}
            >
              {tool.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

describe('DevToolsPanel Component', () => {
  const mockTools: Tool[] = [
    { id: 'pesticide', name: 'Pesticide', enabled: false },
    { id: 'colorPicker', name: 'Color Picker', enabled: true },
  ];

  const mockToggle = vi.fn();

  it('renders all tools', () => {
    render(<DevToolsPanel tools={mockTools} onToggle={mockToggle} />);

    expect(screen.getByText('Pesticide')).toBeInTheDocument();
    expect(screen.getByText('Color Picker')).toBeInTheDocument();
  });

  it('shows correct button state for enabled tool', () => {
    render(<DevToolsPanel tools={mockTools} onToggle={mockToggle} />);

    expect(screen.getByText('Disable')).toBeInTheDocument();
  });

  it('shows correct button state for disabled tool', () => {
    render(<DevToolsPanel tools={mockTools} onToggle={mockToggle} />);

    expect(screen.getByText('Enable')).toBeInTheDocument();
  });
});
