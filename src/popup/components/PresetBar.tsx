/**
 * PresetBar — Preset buttons for built-in and user presets
 *
 * Renders built-in presets and user-created presets with
 * save / apply / delete actions.
 */

import type React from 'react';
import type { UserToolPreset } from '../../utils/storage';
import { BUILTIN_TOOL_PRESETS } from '../../utils/tool-catalog';

interface PresetBarProps {
  userPresets: UserToolPreset[];
  onApplyPreset: (presetId: string) => void;
  onApplyUserPreset: (presetId: string) => void;
  onSaveUserPreset: () => void;
  onDeleteUserPreset: (id: string) => void;
}

export const PresetBar: React.FC<PresetBarProps> = ({
  userPresets,
  onApplyPreset,
  onApplyUserPreset,
  onSaveUserPreset,
  onDeleteUserPreset,
}) => {
  return (
    <>
      {/* Built-in Presets */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {BUILTIN_TOOL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onApplyPreset(p.id)}
              className="text-[11px] px-2 py-1 rounded-md bg-primary-/80 border border-primary-/60 text-primary- hover:bg-primary-/80 transition-colors"
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* User Presets */}
      <div className="space-y-1">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
          My presets
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            type="button"
            onClick={onSaveUserPreset}
            className="text-[11px] px-2 py-1 rounded-md bg-[#111827] border border-slate-600 text-slate-200 hover:border-amber-500/50"
          >
            Save current
          </button>
          {userPresets.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onApplyUserPreset(p.id)}
                className="text-[11px] px-2 py-1 rounded-md bg-amber-950/80 border border-amber-800/50 text-amber-100 hover:bg-amber-900/80"
                title={`${p.toolIds.length} tools`}
              >
                {p.name}
              </button>
              <button
                type="button"
                onClick={() => onDeleteUserPreset(p.id)}
                className="text-[10px] px-1 text-slate-500 hover:text-rose-400"
                aria-label={`Delete ${p.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

export default PresetBar;
