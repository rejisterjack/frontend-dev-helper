/**
 * DevTools Panel Component
 *
 * The main panel interface for Chrome DevTools integration.
 * Provides:
 * - Real-time element inspection
 * - Computed styles viewer
 * - Box model visualization
 * - Accessibility properties
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { ElementInfo } from '@/types';
import { logger } from '@/utils/logger';

interface ComputedStyles {
  [property: string]: string;
}

interface BoxModelData {
  margin: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  content: { width: number; height: number };
  position: { top: number; left: number };
}

export const DevToolsPanel: React.FC = () => {
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [computedStyles, setComputedStyles] = useState<ComputedStyles>({});
  const [boxModel, setBoxModel] = useState<BoxModelData | null>(null);
  const [activeTab, setActiveTab] = useState<'styles' | 'computed' | 'layout' | 'accessibility'>(
    'styles'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh the currently selected element from DevTools
   */
  const refreshSelection = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Use chrome.devtools.inspectedWindow.eval to get the selected element info
      chrome.devtools.inspectedWindow.eval(
        `(() => {
          const el = $0;
          if (!el) return null;
          
          const computed = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          // Get all computed styles
          const styles = {};
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i];
            styles[prop] = computed.getPropertyValue(prop);
          }
          
          // Get box model data
          const boxModelData = {
            margin: {
              top: parseFloat(computed.marginTop) || 0,
              right: parseFloat(computed.marginRight) || 0,
              bottom: parseFloat(computed.marginBottom) || 0,
              left: parseFloat(computed.marginLeft) || 0,
            },
            border: {
              top: parseFloat(computed.borderTopWidth) || 0,
              right: parseFloat(computed.borderRightWidth) || 0,
              bottom: parseFloat(computed.borderBottomWidth) || 0,
              left: parseFloat(computed.borderLeftWidth) || 0,
            },
            padding: {
              top: parseFloat(computed.paddingTop) || 0,
              right: parseFloat(computed.paddingRight) || 0,
              bottom: parseFloat(computed.paddingBottom) || 0,
              left: parseFloat(computed.paddingLeft) || 0,
            },
            content: {
              width: rect.width,
              height: rect.height,
            },
            position: {
              top: rect.top + window.scrollY,
              left: rect.left + window.scrollX,
            },
          };
          
          // Get ARIA attributes
          const aria: Record<string, string | null> = {};
          const ariaAttrs = Array.from(el.attributes).filter(a => a.name.startsWith('aria-'));
          ariaAttrs.forEach(attr => {
            aria[attr.name.replace('aria-', '')] = attr.value;
          });
          
          // Build selector
          let selector = el.tagName.toLowerCase();
          if (el.id) {
            selector = '#' + el.id;
          } else if (el.className) {
            selector = '.' + Array.from(el.classList).join('.');
          }
          
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            class: el.className || null,
            classes: Array.from(el.classList),
            selector: selector,
            dimensions: {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top + window.scrollY),
              left: Math.round(rect.left + window.scrollX),
            },
            rect: {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
              left: Math.round(rect.left),
            },
            styles: {
              display: computed.display,
              position: computed.position,
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              fontFamily: computed.fontFamily,
              margin: computed.margin,
              padding: computed.padding,
              border: computed.border,
              borderRadius: computed.borderRadius,
              width: computed.width,
              height: computed.height,
            },
            inlineStyles: el.style.cssText ? (function() {
              var result = {};
              var pairs = el.style.cssText.split(';').filter(function(s) { return s.trim(); });
              for (var i = 0; i < pairs.length; i++) {
                var parts = pairs[i].split(':');
                if (parts.length === 2) {
                  result[parts[0].trim()] = parts[1].trim();
                }
              }
              return result;
            })() : {},
            text: el.textContent?.slice(0, 100) || null,
            children: el.children.length,
            aria,
          };
        })()`,
        (result, isException) => {
          setLoading(false);

          if (isException) {
            setError(isException.description || String(isException) || 'Unknown error');
            return;
          }

          if (result) {
            setSelectedElement(result as ElementInfo);
            // Also update computed styles and box model from the eval result
            // We need to fetch these separately since eval returns the element data
          } else {
            setSelectedElement(null);
          }
        }
      );

      // Fetch computed styles separately
      chrome.devtools.inspectedWindow.eval(
        `(() => {
          const el = $0;
          if (!el) return {};
          const computed = getComputedStyle(el);
          const styles = {};
          // Get commonly used styles
          const commonProps = [
            'display', 'position', 'top', 'right', 'bottom', 'left',
            'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
            'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
            'border-radius', 'border-top-left-radius', 'border-top-right-radius',
            'border-bottom-left-radius', 'border-bottom-right-radius',
            'background', 'background-color', 'background-image',
            'color', 'font-size', 'font-family', 'font-weight', 'line-height',
            'text-align', 'text-decoration', 'text-transform',
            'overflow', 'overflow-x', 'overflow-y',
            'visibility', 'opacity', 'z-index',
            'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
            'grid', 'grid-template', 'grid-gap', 'grid-column', 'grid-row',
            'box-shadow', 'text-shadow', 'transform', 'transition', 'animation'
          ];
          commonProps.forEach(prop => {
            styles[prop] = computed.getPropertyValue(prop);
          });
          return styles;
        })()`,
        (result) => {
          if (result && typeof result === 'object') {
            setComputedStyles(result as ComputedStyles);
          }
        }
      );

      // Fetch box model data
      chrome.devtools.inspectedWindow.eval(
        `(() => {
          const el = $0;
          if (!el) return null;
          const computed = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            margin: {
              top: parseFloat(computed.marginTop) || 0,
              right: parseFloat(computed.marginRight) || 0,
              bottom: parseFloat(computed.marginBottom) || 0,
              left: parseFloat(computed.marginLeft) || 0,
            },
            border: {
              top: parseFloat(computed.borderTopWidth) || 0,
              right: parseFloat(computed.borderRightWidth) || 0,
              bottom: parseFloat(computed.borderBottomWidth) || 0,
              left: parseFloat(computed.borderLeftWidth) || 0,
            },
            padding: {
              top: parseFloat(computed.paddingTop) || 0,
              right: parseFloat(computed.paddingRight) || 0,
              bottom: parseFloat(computed.paddingBottom) || 0,
              left: parseFloat(computed.paddingLeft) || 0,
            },
            content: {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            position: {
              top: Math.round(rect.top + window.scrollY),
              left: Math.round(rect.left + window.scrollX),
            },
          };
        })()`,
        (result) => {
          if (result && typeof result === 'object') {
            setBoxModel(result as BoxModelData);
          }
        }
      );
    } catch (err) {
      setLoading(false);
      setError(String(err));
      logger.error('Failed to refresh selection:', err);
    }
  }, []);

  const copyElementDescriptor = useCallback(() => {
    chrome.devtools.inspectedWindow.eval(
      `(() => {
        const el = $0;
        if (!el || el.nodeType !== 1) return '';
        const tag = el.tagName.toLowerCase();
        const id = el.id ? '#' + el.id : '';
        const cls =
          el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\\s+/).slice(0, 4).join('.')
            : '';
        return tag + id + cls;
      })()`,
      (result) => {
        if (result && typeof result === 'string' && result.length > 0) {
          void navigator.clipboard.writeText(result);
        }
      }
    );
  }, []);

  // Listen for element selection changes in DevTools
  useEffect(() => {
    // Initial load
    refreshSelection();

    // Set up listener for selection changes
    const onSelectionChanged = () => {
      refreshSelection();
    };

    chrome.devtools.panels.elements.onSelectionChanged.addListener(onSelectionChanged);

    // Listen for messages from the devtools script
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        refreshSelection();
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      chrome.devtools.panels.elements.onSelectionChanged.removeListener(onSelectionChanged);
      window.removeEventListener('message', handleMessage);
    };
  }, [refreshSelection]);

  if (error) {
    return (
      <div className="flex h-screen flex-col bg-slate-900 text-slate-200">
        <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">FrontendDevHelper</span>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-red-400">Error loading element data</p>
            <p className="text-sm text-slate-500 mt-2">{error}</p>
            <button
              type="button"
              onClick={refreshSelection}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white">
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
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <span className="font-medium">FrontendDevHelper</span>
        </div>
        <button
          type="button"
          onClick={refreshSelection}
          disabled={loading}
          className="rounded p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50"
          title="Refresh selection"
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
          <div className="border-b border-slate-700 bg-slate-800 px-4 py-2">
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-purple-400">{selectedElement.tag}</span>
              {selectedElement.id && <span className="text-yellow-400">#{selectedElement.id}</span>}
              {selectedElement.classes && selectedElement.classes.length > 0 && (
                <span className="text-blue-400">
                  .{selectedElement.classes.slice(0, 3).join('.')}
                  {selectedElement.classes.length > 3 && ` +${selectedElement.classes.length - 3}`}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-3 flex-wrap">
              <span>
                {selectedElement.dimensions.width} × {selectedElement.dimensions.height}
              </span>
              <span>•</span>
              <span>{selectedElement.children} children</span>
              <span>•</span>
              <button
                type="button"
                onClick={copyElementDescriptor}
                className="text-indigo-400 hover:text-indigo-300 underline-offset-2 hover:underline"
              >
                Copy $0 descriptor
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Popup tools (CSS Inspector, Layout, Contrast, etc.) use the same page context as DevTools—toggle
              them from the extension popup while inspecting here.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700 bg-slate-800">
            {['styles', 'computed', 'layout', 'accessibility'].map((tab) => (
              <button
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab as typeof activeTab)}
                className={`px-4 py-2 text-sm capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-indigo-500 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'styles' && (
              <StylesTab
                styles={selectedElement.styles}
                inlineStyles={selectedElement.inlineStyles || {}}
              />
            )}
            {activeTab === 'computed' && <ComputedTab computedStyles={computedStyles} />}
            {activeTab === 'layout' && boxModel && <LayoutTab boxModel={boxModel} />}
            {activeTab === 'accessibility' && (
              <AccessibilityTab aria={selectedElement.aria || {}} tagName={selectedElement.tag} />
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <p className="text-slate-400">Select an element to inspect</p>
            <p className="mt-2 text-sm text-slate-500">
              Use the Elements panel to select an element
            </p>
            <button
              type="button"
              onClick={refreshSelection}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// Sub-components
// ============================================

const StylesTab: React.FC<{
  styles: Record<string, string>;
  inlineStyles: Record<string, string>;
}> = ({ styles, inlineStyles }) => (
  <div className="space-y-4">
    {Object.keys(inlineStyles).length > 0 && (
      <div>
        <div className="mb-2 text-xs font-medium text-slate-500">Inline Styles</div>
        <div className="rounded-lg bg-slate-800 p-3 font-mono text-sm">
          {Object.entries(inlineStyles).map(([prop, value]) => (
            <div key={prop} className="flex justify-between">
              <span className="text-purple-400">{prop}:</span>
              <span className="text-yellow-300">{value};</span>
            </div>
          ))}
        </div>
      </div>
    )}

    <div>
      <div className="mb-2 text-xs font-medium text-slate-500">Key Styles</div>
      <div className="space-y-1">
        {Object.entries(styles).map(([prop, value]) => (
          <div key={prop} className="flex justify-between rounded px-2 py-1 hover:bg-slate-800">
            <span className="text-slate-400">{prop}</span>
            <span className="text-slate-200 font-mono text-sm">{value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ComputedTab: React.FC<{
  computedStyles: ComputedStyles;
}> = ({ computedStyles }) => (
  <div>
    <div className="mb-2 text-xs font-medium text-slate-500">
      Computed Styles ({Object.keys(computedStyles).length} properties)
    </div>
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {Object.entries(computedStyles)
        .filter(([_, value]) => value && value !== 'none' && value !== '0px' && value !== 'normal')
        .map(([prop, value]) => (
          <div key={prop} className="flex justify-between rounded px-2 py-1 hover:bg-slate-800">
            <span className="text-slate-400 text-sm">{prop}</span>
            <span className="text-slate-200 font-mono text-xs truncate max-w-[200px]">{value}</span>
          </div>
        ))}
    </div>
  </div>
);

const LayoutTab: React.FC<{ boxModel: BoxModelData }> = ({ boxModel }) => {
  const { margin, border, padding, content, position } = boxModel;

  return (
    <div className="space-y-4">
      {/* Box Model Visualization */}
      <div className="mb-4 rounded-lg bg-slate-800 p-4">
        <div className="text-xs text-slate-500 mb-2">Box Model</div>
        <div className="mx-auto w-64">
          {/* Margin */}
          <div
            className="rounded border-2 border-dashed border-orange-500/50 bg-orange-500/10 p-2"
            title="Margin"
          >
            <div className="text-center text-[10px] text-orange-400 mb-1">
              margin{' '}
              {margin.top > 0 || margin.right > 0 || margin.bottom > 0 || margin.left > 0
                ? `(${margin.top}/${margin.right}/${margin.bottom}/${margin.left})`
                : ''}
            </div>
            {/* Border */}
            <div className="rounded border-2 border-yellow-500/50 bg-yellow-500/10 p-2">
              <div className="text-center text-[10px] text-yellow-400 mb-1">
                border{' '}
                {border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0
                  ? `(${border.top}/${border.right}/${border.bottom}/${border.left})`
                  : ''}
              </div>
              {/* Padding */}
              <div className="rounded border-2 border-green-500/50 bg-green-500/10 p-2">
                <div className="text-center text-[10px] text-green-400 mb-1">
                  padding{' '}
                  {padding.top > 0 || padding.right > 0 || padding.bottom > 0 || padding.left > 0
                    ? `(${padding.top}/${padding.right}/${padding.bottom}/${padding.left})`
                    : ''}
                </div>
                {/* Content */}
                <div className="rounded bg-blue-500/20 p-4 text-center">
                  <div className="text-[10px] text-blue-400">content</div>
                  <div className="text-sm font-medium">
                    {content.width} × {content.height}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-slate-800 p-3">
          <div className="text-xs text-slate-500">Position (from viewport)</div>
          <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-sm">
            <div>
              <span className="text-slate-500">top:</span>{' '}
              <span className="text-slate-200">{position.top}</span>
            </div>
            <div>
              <span className="text-slate-500">left:</span>{' '}
              <span className="text-slate-200">{position.left}</span>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-slate-800 p-3">
          <div className="text-xs text-slate-500">Content Dimensions</div>
          <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-sm">
            <div>
              <span className="text-slate-500">width:</span>{' '}
              <span className="text-slate-200">{content.width}</span>
            </div>
            <div>
              <span className="text-slate-500">height:</span>{' '}
              <span className="text-slate-200">{content.height}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccessibilityTab: React.FC<{
  aria: Record<string, string | null>;
  tagName: string;
}> = ({ aria, tagName }) => {
  const ariaEntries = Object.entries(aria).filter(([_, value]) => value !== null);

  return (
    <div className="space-y-4">
      {/* Element Info */}
      <div className="rounded-lg bg-slate-800 p-3">
        <div className="text-xs text-slate-500 mb-2">Semantic Info</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Tag</span>
            <span className="font-mono">{tagName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Is landmark</span>
            <span>
              {['header', 'nav', 'main', 'aside', 'footer', 'section', 'article'].includes(tagName)
                ? 'Yes'
                : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Is interactive</span>
            <span>
              {['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* ARIA Properties */}
      <div>
        <div className="mb-2 text-xs font-medium text-slate-500">
          ARIA Properties ({ariaEntries.length})
        </div>
        {ariaEntries.length > 0 ? (
          <div className="space-y-1">
            {ariaEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between rounded px-2 py-1 hover:bg-slate-800">
                <span className="text-slate-400">aria-{key}</span>
                <span className="text-slate-200 font-mono text-sm">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic">No ARIA attributes defined</p>
        )}
      </div>

      {/* Accessibility Recommendations */}
      <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700">
        <div className="text-xs text-slate-500 mb-2">💡 Recommendations</div>
        <ul className="text-sm text-slate-400 space-y-1">
          {!aria.role && <li>• Consider adding a role attribute</li>}
          {!aria.label && !aria['labelledby'] && (
            <li>• Add aria-label or aria-labelledby for context</li>
          )}
          {tagName === 'img' && !aria.label && <li>• Images should have alt text or aria-label</li>}
          {ariaEntries.length === 0 && <li>• This element has no ARIA attributes defined</li>}
          {ariaEntries.length > 0 && <li>• Element has proper ARIA attributes ✓</li>}
        </ul>
      </div>
    </div>
  );
};

export default DevToolsPanel;
