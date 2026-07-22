/**
 * Hook that auto-saves and restores profiling sessions.
 *
 * Ported from react-perf-profiler/apps/ext/src/panel/hooks/useSessionPersistence.ts.
 * - On mount: checks chrome.storage for the last session and offers restore via callback.
 * - While recording: auto-saves every 5 seconds.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useProfilerStore } from "@/stores/use-profiler-store";
import {
  saveProfile,
  loadProfile,
  type ProfileData,
} from "@/lib/profiler/profilePersistence";

const AUTO_SAVE_KEY = "auto-save";
const AUTO_SAVE_INTERVAL_MS = 5000;

interface UseSessionPersistenceOptions {
  onSessionFound?: (data: ProfileData) => void;
}

interface UseSessionPersistenceReturn {
  saveSession: (name: string) => void;
  restoreSession: (name: string) => Promise<ProfileData | null>;
  hasSavedSession: boolean;
  savedSessionData: ProfileData | null;
  dismissSavedSession: () => void;
}

export function useSessionPersistence(
  options: UseSessionPersistenceOptions = {},
): UseSessionPersistenceReturn {
  const { onSessionFound } = options;

  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [savedSessionData, setSavedSessionData] = useState<ProfileData | null>(
    null,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storeRef = useRef(useProfilerStore.getState);
  storeRef.current = useProfilerStore.getState;

  useEffect(() => {
    let cancelled = false;

    async function checkForSession() {
      const data = await loadProfile(AUTO_SAVE_KEY);
      if (cancelled) return;

      if (data && data.commits.length > 0) {
        setSavedSessionData(data);
        setHasSavedSession(true);
        onSessionFound?.(data);
      }
    }

    checkForSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    const unsubscribe = useProfilerStore.subscribe((state, prevState) => {
      const startedRecording = !prevState.isRecording && state.isRecording;
      const stoppedRecording = prevState.isRecording && !state.isRecording;

      if (startedRecording) {
        intervalRef.current = setInterval(() => {
          const { commits } = storeRef.current();
          if (commits.length > 0) {
            saveProfile(AUTO_SAVE_KEY, {
              commits: [...commits],
              timestamp: Date.now(),
            });
          }
        }, AUTO_SAVE_INTERVAL_MS);
      }

      if (stoppedRecording) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        const { commits } = storeRef.current();
        if (commits.length > 0) {
          saveProfile(AUTO_SAVE_KEY, {
            commits: [...commits],
            timestamp: Date.now(),
          });
        }
      }
    });

    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const saveSession = useCallback((name: string) => {
    const { commits } = storeRef.current();
    saveProfile(name, {
      commits: [...commits],
      timestamp: Date.now(),
    });
  }, []);

  const restoreSession = useCallback(
    async (name: string): Promise<ProfileData | null> => {
      const data = await loadProfile(name);
      if (data) {
        setSavedSessionData(data);
        setHasSavedSession(true);
      }
      return data;
    },
    [],
  );

  const dismissSavedSession = useCallback(() => {
    setHasSavedSession(false);
  }, []);

  return {
    saveSession,
    restoreSession,
    hasSavedSession,
    savedSessionData,
    dismissSavedSession,
  };
}
