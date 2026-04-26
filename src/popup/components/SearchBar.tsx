/**
 * SearchBar — Search input with keyboard shortcut
 *
 * Sticky search bar at the top of the tools tab.
 * Press "/" to focus, Escape to clear and blur.
 * Supports arrow-key navigation through visible tool cards.
 */

import type React from 'react';
import { useEffect, useRef } from 'react';
import type { ToolId } from '../../constants';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Flat list of visible tool IDs for arrow-key navigation */
  flatToolIds: ToolId[];
  /** Currently focused index (-1 = search input) */
  focusedSearchIndex: number;
  /** Callback for key events in the search input */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Ref map for tool card DOM elements */
  toolCardRefs?: React.RefObject<Map<ToolId, HTMLDivElement>>;
  /** Callback to reset focused index */
  onResetFocus?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  flatToolIds,
  focusedSearchIndex,
  onKeyDown,
  onResetFocus,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && inputRef.current === document.activeElement) {
        onChange('');
        onResetFocus?.();
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange, onResetFocus]);

  return (
    <div className="relative sticky top-0 z-10">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search tools..."
        aria-label="Search tools"
        role="combobox"
        aria-expanded={value.length > 0}
        aria-activedescendant={focusedSearchIndex >= 0 ? `tool-card-${flatToolIds[focusedSearchIndex]}` : undefined}
        className="w-full bg-[#111827] border border-[#1f2937] text-slate-100 text-sm rounded-lg pl-9 pr-9 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
          title="Clear search"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      ) : (
        <kbd className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
            /
          </span>
        </kbd>
      )}
    </div>
  );
};

export default SearchBar;
