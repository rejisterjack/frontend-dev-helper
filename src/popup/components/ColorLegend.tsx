import React, { useState } from 'react';

// ============================================
// Color Legend Component
// Displays color coding for DOM Outliner tool
// ============================================

interface ColorLegendItem {
  tag: string;
  color: string;
  label: string;
}

const defaultLegendItems: ColorLegendItem[] = [
  { tag: 'div', color: '#ff0055', label: 'Container' },
  { tag: 'span', color: '#00ff55', label: 'Inline' },
  { tag: 'a', color: '#ff5500', label: 'Link' },
  { tag: 'img', color: '#0055ff', label: 'Image' },
  { tag: 'h1-h6', color: '#aa00ff', label: 'Heading' },
  { tag: 'p', color: '#ffaa00', label: 'Paragraph' },
  { tag: 'input', color: '#00aaff', label: 'Input' },
  { tag: 'button', color: '#ff00aa', label: 'Button' },
  { tag: 'form', color: '#aaff00', label: 'Form' },
  { tag: 'ul/ol', color: '#55ff00', label: 'List' },
];

interface ColorLegendProps {
  /** Custom legend items (optional) */
  items?: ColorLegendItem[];
  /** Whether the legend is collapsed by default */
  collapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ColorLegend: React.FC<ColorLegendProps> = ({
  items = defaultLegendItems,
  collapsed = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleColorClick = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1000);
  };

  return (
    <div className={`bg-slate-800/50 rounded-lg overflow-hidden ${className}`}>
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          Color Legend
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Legend Grid */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-3 pt-0">
          <div className="grid grid-cols-5 gap-2">
            {items.map((item) => (
              <button
                key={item.tag}
                onClick={() => handleColorClick(item.color)}
                className="color-legend-item group flex flex-col items-center gap-1 p-1.5 rounded hover:bg-slate-700/50 transition-all"
                title={`${item.tag} - ${item.label} (${item.color}) - Click to copy`}
              >
                <span
                  className="color-swatch w-6 h-6 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-slate-400 font-mono">
                  &lt;{item.tag}&gt;
                </span>
                {copiedColor === item.color && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-emerald-500 text-white px-1 rounded">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Legend Description */}
          <p className="mt-2 text-[10px] text-slate-500 text-center">
            Each color represents a different HTML element type when outlines are visible
          </p>
        </div>
      </div>
    </div>
  );
};

export default ColorLegend;
