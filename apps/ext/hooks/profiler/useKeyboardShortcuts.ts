/**
 * Keyboard shortcuts hook for the profiler panel.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/hooks/useKeyboardShortcuts.ts.
 * Adapted: view modes are FDH's tab names.
 *
 * Shortcuts:
 *   Ctrl/Cmd + R   — toggle recording
 *   Ctrl/Cmd + E   — export profile
 *   Ctrl/Cmd + 1-7 — switch view tabs
 *   Escape          — deselect component
 *   Ctrl/Cmd + F   — focus search
 */

import { useEffect } from "react";

export type ProfilerViewMode =
  | "tree"
  | "flamegraph"
  | "timeline"
  | "analysis"
  | "vitals"
  | "compare"
  | "dependencies";

const VIEW_MODES: ProfilerViewMode[] = [
  "tree",
  "flamegraph",
  "timeline",
  "analysis",
  "vitals",
  "compare",
  "dependencies",
];

export interface KeyboardShortcutCallbacks {
  onToggleRecording: () => void;
  onExport: () => void;
  onSwitchView: (mode: ProfilerViewMode) => void;
  onDeselectComponent: () => void;
  onFocusSearch: () => void;
}

export function useKeyboardShortcuts(
  callbacks: KeyboardShortcutCallbacks,
): void {
  const {
    onToggleRecording,
    onExport,
    onSwitchView,
    onDeselectComponent,
    onFocusSearch,
  } = callbacks;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "r") {
        e.preventDefault();
        onToggleRecording();
        return;
      }

      if (mod && e.key === "e") {
        e.preventDefault();
        onExport();
        return;
      }

      if (mod && e.key === "f") {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (mod && e.key >= "1" && e.key <= "7") {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const mode = VIEW_MODES[index];
        if (mode) onSwitchView(mode);
        return;
      }

      if (e.key === "Escape") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") {
          return;
        }
        e.preventDefault();
        onDeselectComponent();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onToggleRecording,
    onExport,
    onSwitchView,
    onDeselectComponent,
    onFocusSearch,
  ]);
}
