import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ExtensionEmptyState } from '@/components/ui/ExtensionStates';
import { MESSAGE_TYPES, TOOL_METADATA, type ToolId } from '@/constants';
import { STARTER_TOOL_IDS } from '@/utils/tool-catalog';

/**
 * Chrome Side Panel: active tool count, starter quick toggles, link to options.
 */
const SidePanelApp: React.FC = () => {
  const [activeIds, setActiveIds] = useState<ToolId[]>([]);

  const load = useCallback(async () => {
    try {
      const result = await chrome.storage.local.get('fdh_tool_states');
      const storage = result.fdh_tool_states as
        | { global?: Partial<Record<ToolId, { enabled?: boolean }>> }
        | undefined;
      const global = storage?.global ?? {};
      const ids = (Object.entries(global) as [ToolId, { enabled?: boolean }][])
        .filter(([, s]) => s?.enabled)
        .map(([id]) => id);
      setActiveIds(ids);
    } catch {
      setActiveIds([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const onChanged: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area === 'local' && changes.fdh_tool_states) void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [load]);

  const toggleStarter = (toolId: ToolId) => {
    void chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TOGGLE_TOOL,
      payload: { toolId },
    });
  };

  return (
    <div className="p-3 text-sm space-y-4 min-h-screen">
      <header>
        <h1 className="font-semibold text-base text-white">FrontendDevHelper</h1>
        <p className="text-xs text-slate-400 mt-1">
          {activeIds.length > 0
            ? `${activeIds.length} active · ${activeIds.map((id) => TOOL_METADATA[id]?.name ?? id).join(', ')}`
            : 'Nothing running yet'}
        </p>
      </header>

      {activeIds.length === 0 ? (
        <ExtensionEmptyState
          icon="🧰"
          title="No tools active"
          description="Turn on tools from the popup or use quick toggles below. Active tools apply to the current tab only unless you use global presets."
          className="py-4"
        />
      ) : null}

      <section>
        <h2 className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Quick toggle (starter)</h2>
        <ul className="space-y-2">
          {STARTER_TOOL_IDS.map((id) => {
            const m = TOOL_METADATA[id];
            const on = activeIds.includes(id);
            return (
              <li key={id} className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span className="truncate">{m.name}</span>
                <button
                  type="button"
                  onClick={() => toggleStarter(id)}
                  className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium border ${
                    on
                      ? 'border-emerald-600 bg-emerald-950 text-emerald-200'
                      : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {on ? 'On' : 'Off'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="text-[11px] text-slate-500 space-y-2">
        <button
          type="button"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full rounded-md border border-slate-600 bg-slate-800 py-2 text-slate-200 hover:bg-slate-700"
        >
          Open options
        </button>
        <p>Command palette on the page: Ctrl+Shift+P (⌘⇧P). Full presets and tools live in the popup.</p>
      </section>
    </div>
  );
};

export default SidePanelApp;
