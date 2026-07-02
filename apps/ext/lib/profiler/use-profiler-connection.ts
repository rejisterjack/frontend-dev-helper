/**
 * React Profiler connection manager.
 *
 * Owns the long-lived port to the background service worker and translates
 * incoming profiler messages into store updates. The DevTools panel uses
 * this hook; the sidepanel/popup variants can reuse it too.
 */

import { useEffect, useRef } from "react";
import { useProfilerStore } from "@/stores/use-profiler-store";
import type { CommitData } from "@repo/profiler-contract";

type BridgePort = chrome.runtime.Port;

interface OutgoingCommand {
  type:
    | "START"
    | "STOP"
    | "PING"
    | "DETECT_REACT"
    | "FORCE_INIT"
    | "SET_CONFIG"
    | "GET_COMPONENT_TREE";
  [key: string]: unknown;
}

export function useProfilerConnection(tabId: number | null) {
  const portRef = useRef<BridgePort | null>(null);

  const startRecording = useProfilerStore((s) => s.startRecording);
  const stopRecording = useProfilerStore((s) => s.stopRecording);
  const addCommit = useProfilerStore((s) => s.addCommit);
  const setStatus = useProfilerStore((s) => s.setStatus);
  const setReactVersion = useProfilerStore((s) => s.setReactVersion);
  const setError = useProfilerStore((s) => s.setError);

  useEffect(() => {
    if (tabId === null) return;
    const port = chrome.runtime.connect({
      name: `fdh-profiler-panel@${tabId}`,
    });
    portRef.current = port;
    setStatus("connecting");

    const handleIncoming = (msg: unknown) => {
      const record = msg as
        | { from?: string; payload?: { type?: string; [k: string]: unknown } }
        | undefined;
      if (!record?.payload?.type) return;
      const payload = record.payload;
      switch (payload.type) {
        case "INIT": {
          const data = payload.data as
            | { reactVersion?: string; success?: boolean }
            | undefined;
          if (data?.reactVersion) setReactVersion(data.reactVersion);
          setStatus("connected");
          setError(undefined);
          break;
        }
        case "START":
          startRecording();
          break;
        case "STOP":
          stopRecording();
          break;
        case "COMMIT": {
          const data = payload.data as CommitData | undefined;
          if (data) addCommit(data);
          break;
        }
        case "COMMIT_BATCH": {
          const batch = payload.data as CommitData[] | undefined;
          if (Array.isArray(batch)) {
            for (const c of batch) addCommit(c);
          }
          break;
        }
        case "ERROR": {
          const errorType = payload.errorType as string | undefined;
          if (
            errorType === "REACT_NOT_FOUND" ||
            errorType === "DEVTOOLS_NOT_FOUND"
          ) {
            setStatus("no-react");
          } else {
            setStatus("error");
          }
          setError(payload.error as string | undefined);
          break;
        }
        case "DETECT_RESULT": {
          if (payload.reactVersion)
            setReactVersion(payload.reactVersion as string);
          if (payload.reactDetected === false) {
            setStatus("no-react");
          } else {
            setStatus("connected");
          }
          break;
        }
      }
    };

    port.onMessage.addListener(handleIncoming);
    port.onDisconnect.addListener(() => {
      setStatus("disconnected");
      portRef.current = null;
    });

    // Probe for React on connect
    send(port, { type: "DETECT_REACT" });

    return () => {
      port.disconnect();
      portRef.current = null;
    };
  }, [
    tabId,
    addCommit,
    startRecording,
    stopRecording,
    setStatus,
    setReactVersion,
    setError,
  ]);

  function send(port: BridgePort, command: OutgoingCommand) {
    try {
      port.postMessage({ target: "bridge", payload: command });
    } catch {
      /* port may not be ready */
    }
  }

  return {
    sendCommand: (command: OutgoingCommand) => {
      const port = portRef.current;
      if (port) send(port, command);
    },
  };
}
