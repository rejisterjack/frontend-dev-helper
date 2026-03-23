import type React from 'react';
import type { ToolType } from '../../types';
import { ToggleSwitch } from './ToggleSwitch';

// ============================================
// Tool Card Component
// Reusable card component for each tool in the popup
// ============================================

interface ToolCardProps {
  /** Tool type identifier */
  type: ToolType;
  /** Tool display name */
  name: string;
  /** Brief description of what the tool does */
  description: string;
  /** Icon to display (emoji or SVG) */
  icon: string;
  /** Whether the tool is currently enabled */
  enabled: boolean;
  /** Whether the tool has configurable settings */
  hasSettings: boolean;
  /** Accent color for the tool icon */
  color: string;
  /** Callback when toggle is changed */
  onToggle: (enabled: boolean) => void;
  /** Callback when settings button is clicked */
  onSettingsClick?: () => void;
  /** Callback when view button is clicked (for tools with panels) */
  onView?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Animation delay class for staggered animations */
  animationDelay?: string;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  type,
  name,
  description,
  icon,
  enabled,
  hasSettings,
  color,
  onToggle,
  onSettingsClick,
  onView,
  className = '',
  animationDelay = '',
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle if clicking on the toggle switch or settings button
    const target = e.target as HTMLElement;
    if (target.closest('.toggle-switch') || target.closest('.settings-btn')) {
      return;
    }
    onToggle(!enabled);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(!enabled);
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: contains nested <button> elements — cannot use outer <button>
    <div
      className={`
        tool-card animate-fade-in
        relative flex items-center gap-3 p-3 rounded-xl cursor-pointer
        ${
          enabled
            ? 'bg-gradient-to-r from-slate-800 to-slate-800/80 border border-emerald-500/50'
            : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
        }
        ${className}
        ${animationDelay}
      `}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={enabled}
      data-tool={type}
    >
      {/* Active Indicator */}
      {enabled && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />
      )}

      {/* Tool Icon */}
      <div
        className={`
          flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl
          transition-all duration-200
          ${enabled ? 'bg-slate-700/80 scale-110' : 'bg-slate-700/50'}
        `}
        style={{ color: enabled ? color : '#64748b' }}
      >
        <span className={`tool-icon ${enabled ? 'animate-pulse-soft' : ''}`}>{icon}</span>
      </div>

      {/* Tool Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={`
            font-semibold text-sm truncate
            ${enabled ? 'text-white' : 'text-slate-200'}
          `}
          >
            {name}
          </h3>
          {enabled && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-slate-400 truncate mt-0.5">{description}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* View Button - shown when tool is enabled and has onView handler */}
        {enabled && onView && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="view-btn btn-icon text-slate-300 hover:text-white"
            title={`View ${name}`}
            aria-label={`View ${name}`}
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        )}

        {/* Settings Button */}
        {hasSettings && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSettingsClick?.();
            }}
            className={`
              settings-btn btn-icon
              ${enabled ? 'text-slate-300 hover:text-white' : 'text-slate-500'}
            `}
            title={`${name} settings`}
            aria-label={`${name} settings`}
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        )}

        {/* Toggle Switch */}
        <ToggleSwitch checked={enabled} onChange={onToggle} label={`Toggle ${name}`} />
      </div>
    </div>
  );
};

export default ToolCard;
