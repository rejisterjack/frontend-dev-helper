/**
 * DevTools Panel Component
 * 
 * The main panel interface for Chrome DevTools integration.
 */

import React, { useState, useEffect } from 'react';
import type { ElementInfo } from '@/types';

export const DevToolsPanel: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [activeTab, setActiveTab] = useState('styles');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for messages from the inspected page
    const handleMessage = (event: MessageEvent): void => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Get selected element from DevTools
  const refreshSelection = async (): Promise<void> => {
    setLoading(true);
    try {
      // This would be called when the user wants to refresh element data
      // In practice, we'd use chrome.devtools.inspectedWindow.eval
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-dev-bg text-dev-text">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-dev-border bg-dev-surface px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-600 text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="font-medium">FrontendDevHelper</span>
        </div>
        <button
          onClick={refreshSelection}
          disabled={loading}
          className="rounded p-1 text-dev-muted hover:text-dev-text disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </header>

      {/* Element Info */}
      {selectedElement ? (
        <>
          <div className="border-b border-dev-border bg-dev-surface px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-syntax-keyword">{selectedElement.tag}</span>
              {selectedElement.id && (
                <span className="text-syntax-string">#{selectedElement.id}</span>
              )}
              {selectedElement.classes.length > 0 && (
                <span className="text-syntax-variable">
                  .{selectedElement.classes.slice(0, 3).join('.')}
                  {selectedElement.classes.length > 3 && '...'}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-dev-muted">
              {Math.round(selectedElement.rect.width)} ×{' '}
              {Math.round(selectedElement.rect.height)}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-dev-border bg-dev-surface">
            {['styles', 'computed', 'layout', 'accessibility'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-primary-500 text-primary-400'
                    : 'text-dev-muted hover:text-dev-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'styles' && (
              <StylesTab styles={selectedElement.styles} inlineStyles={selectedElement.inlineStyles} />
            )}
            {activeTab === 'computed' && <ComputedTab element={selectedElement} />}
            {activeTab === 'layout' && <LayoutTab rect={selectedElement.rect} />}
            {activeTab === 'accessibility' && <AccessibilityTab aria={selectedElement.aria} />}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <p className="text-dev-muted">Select an element to inspect</p>
            <p className="mt-2 text-sm text-dev-muted">
              Use the Element Inspector or select an element in the Elements panel
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const StylesTab: React.FC<{
  styles: Record<string, string>;
  inlineStyles: Record<string, string>;
}> = ({ styles, inlineStyles }) => (
  <div className="space-y-4">
    {Object.keys(inlineStyles).length > 0 && (
      <div>
        <div className="mb-2 text-xs font-medium text-dev-muted">Inline Styles</div>
        <div className="rounded-lg bg-dev-surface p-3 font-mono text-sm">
          {Object.entries(inlineStyles).map(([prop, value]) => (
            <div key={prop} className="flex justify-between">
              <span className="text-syntax-property">{prop}:</span>
              <span className="text-syntax-string">{value};</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div>
      <div className="mb-2 text-xs font-medium text-dev-muted">Computed Styles</div>
      <div className="space-y-1">
        {Object.entries(styles).map(([prop, value]) => (
          <div key={prop} className="flex justify-between rounded px-2 py-1 hover:bg-dev-surface">
            <span className="text-syntax-property">{prop}</span>
            <span className="text-syntax-string">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ComputedTab: React.FC<{ element: ElementInfo }> = ({ element }) => (
  <div>
    <div className="mb-2 text-xs font-medium text-dev-muted">Box Model</div>
    <div className="rounded-lg bg-dev-surface p-4">
      <div className="mx-auto w-48">
        {/* Margin */}
        <div className="rounded border-2 border-dashed border-orange-300 bg-orange-500/20 p-2">
          <div className="text-center text-xs text-orange-300">margin</div>
          {/* Border */}
          <div className="rounded border-2 border-red-300 bg-red-500/20 p-2">
            <div className="text-center text-xs text-red-300">border</div>
            {/* Padding */}
            <div className="rounded border-2 border-green-300 bg-green-500/20 p-2">
              <div className="text-center text-xs text-green-300">padding</div>
              {/* Content */}
              <div className="rounded bg-blue-500/20 p-4 text-center">
                <div className="text-xs text-blue-300">content</div>
                <div className="text-sm">
                  {Math.round(element.rect.width)} × {Math.round(element.rect.height)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LayoutTab: React.FC<{ rect: DOMRect }> = ({ rect }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-lg bg-dev-surface p-3">
        <div className="text-xs text-dev-muted">Position</div>
        <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-sm">
          <div>
            <span className="text-dev-muted">top:</span> {Math.round(rect.top)}
          </div>
          <div>
            <span className="text-dev-muted">left:</span> {Math.round(rect.left)}
          </div>
        </div>
      </div>
      <div className="rounded-lg bg-dev-surface p-3">
        <div className="text-xs text-dev-muted">Dimensions</div>
        <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-sm">
          <div>
            <span className="text-dev-muted">width:</span> {Math.round(rect.width)}
          </div>
          <div>
            <span className="text-dev-muted">height:</span> {Math.round(rect.height)}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AccessibilityTab: React.FC<{
  aria: Record<string, string | boolean | number | undefined>;
}> = ({ aria }) => (
  <div>
    <div className="mb-2 text-xs font-medium text-dev-muted">ARIA Properties</div>
    <div className="space-y-1">
      {Object.entries(aria).map(([key, value]) =>
        value !== undefined ? (
          <div key={key} className="flex justify-between rounded px-2 py-1 hover:bg-dev-surface">
            <span className="text-syntax-property">aria-{key}</span>
            <span className="text-syntax-string">{String(value)}</span>
          </div>
        ) : null
      )}
    </div>
  </div>
);
