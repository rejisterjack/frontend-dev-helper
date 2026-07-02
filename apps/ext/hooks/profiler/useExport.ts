/**
 * Export / import hook for profiler sessions.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/hooks/useExport.ts.
 * Adapted: FDH's store uses a plain CommitData[] (not a CircularBuffer).
 */

import { useCallback } from "react";
import { useProfilerStore } from "@/stores/use-profiler-store";
import {
  exportToFile,
  importFromFile,
  type ProfileData,
} from "@/lib/profiler/profilePersistence";
import { exportAsCPUProfile } from "@/lib/profiler/cpuProfileExport";

interface UseExportReturn {
  exportProfile: (filename?: string) => void;
  importProfile: () => Promise<ProfileData | null>;
  exportAsCPUProfile: (filename?: string) => void;
}

export function useExport(): UseExportReturn {
  const loadSession = useProfilerStore((s) => s.loadSession);
  const clearSession = useProfilerStore((s) => s.clear);

  const exportProfile = useCallback((filename?: string) => {
    const { commits } = useProfilerStore.getState();
    const timestamp = Date.now();
    const defaultName = `fdh-profile-${new Date(timestamp).toISOString().replace(/[:.]/g, "-")}.json`;

    exportToFile(
      {
        commits: [...commits],
        timestamp,
      },
      filename ?? defaultName,
    );
  }, []);

  const importProfile = useCallback(async (): Promise<ProfileData | null> => {
    const data = await importFromFile();
    if (!data) return null;

    clearSession();
    loadSession(data.commits, {
      startedAt: data.timestamp,
      endedAt: Date.now(),
    });

    return data;
  }, [loadSession, clearSession]);

  const exportCPUProfile = useCallback((filename?: string) => {
    const { commits } = useProfilerStore.getState();
    if (commits.length === 0) return;
    exportAsCPUProfile([...commits], filename);
  }, []);

  return { exportProfile, importProfile, exportAsCPUProfile: exportCPUProfile };
}
