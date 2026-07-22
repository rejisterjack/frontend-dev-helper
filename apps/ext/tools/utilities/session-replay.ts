import type { ToolDefinition } from "../types";
import { ToolPanel, createButton } from "@/content/tool-panel";
import { getOverlayContainer } from "@/content/overlay-manager";
import type {
  SessionRecording,
  SessionEvent,
  SessionEventType,
} from "@/lib/session-recorder";
import { SessionRecorder } from "@/lib/session-recorder";
import { getSessionStorage } from "@/lib/session-storage";

// ============================================================
// Event type visual config
// ============================================================

const EVENT_CONFIG: Record<
  SessionEventType,
  { color: string; label: string; icon: string }
> = {
  "tool-activated": { color: "#22c55e", label: "Tool Activated", icon: "●" },
  "tool-deactivated": {
    color: "#ef4444",
    label: "Tool Deactivated",
    icon: "●",
  },
  "element-selected": {
    color: "#3b82f6",
    label: "Element Selected",
    icon: "●",
  },
  "ai-message": { color: "#a855f7", label: "AI Message", icon: "●" },
  "screenshot-captured": { color: "#f59e0b", label: "Screenshot", icon: "📷" },
  "page-navigation": { color: "#06b6d4", label: "Navigation", icon: "→" },
  annotation: { color: "#eab308", label: "Annotation", icon: "★" },
  "user-action": { color: "#94a3b8", label: "User Action", icon: "●" },
};

const SPEED_OPTIONS = [
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "5x", value: 5 },
  { label: "10x", value: 10 },
];

// ============================================================
// DOM helpers (safe construction, no innerHTML)
// ============================================================

function h(
  tag: string,
  styles: Record<string, string>,
  children?: (HTMLElement | string)[],
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(styles)) {
    el.style.setProperty(k, v);
  }
  if (children) {
    for (const child of children) {
      if (typeof child === "string") {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
  }
  return el;
}

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

// ============================================================
// Tool definition
// ============================================================

export const sessionReplay: ToolDefinition = {
  id: "session-replay",
  name: "Session Replay",
  description: "Record and replay debugging sessions for team collaboration",
  category: "utility",
  icon: "Video",
  configSchema: {
    recordTools: {
      type: "boolean",
      label: "Record Tool Events",
      default: true,
    },
    recordElementSelection: {
      type: "boolean",
      label: "Record Element Selection",
      default: true,
    },
    recordAIMessages: {
      type: "boolean",
      label: "Record AI Messages",
      default: true,
    },
    maxThumbnailSize: {
      type: "slider",
      label: "Thumbnail Size (px)",
      default: 200,
      min: 100,
      max: 400,
      step: 50,
    },
  },

  run(ctx, config) {
    const cfg = config ?? {};
    const recordTools = (cfg.recordTools as boolean) ?? true;
    const recordElementSelection =
      (cfg.recordElementSelection as boolean) ?? true;
    const recordAIMessages = (cfg.recordAIMessages as boolean) ?? true;
    const maxThumbnailSize = (cfg.maxThumbnailSize as number) ?? 200;
    let disposed = false;
    let panel: ToolPanel | null = null;
    let currentView: "list" | "player" = "list";
    let selectedSessionId: string | null = null;

    // Playback state
    let playbackTimer: ReturnType<typeof setTimeout> | null = null;
    let playbackIndex = 0;
    let playbackSpeed = 1;
    let isPlaying = false;
    let playbackProgress = 0; // 0-100

    // Recording state
    const recorder = new SessionRecorder();
    let recordingInterval: ReturnType<typeof setInterval> | null = null;

    const { shadow } = getOverlayContainer();
    const storage = getSessionStorage();

    panel = new ToolPanel({
      title: "Session Replay",
      width: 520,
      maxHeight: "90vh",
      onClose: cleanup,
    });

    // Initialize storage and render
    storage.init().then(() => {
      if (disposed) return;
      renderView(panel!.getContainer());
    });

    panel.mount(shadow);

    // ---- View routing ----
    function renderView(container: HTMLDivElement): void {
      clearChildren(container);

      if (currentView === "player" && selectedSessionId) {
        renderPlayerView(container);
      } else {
        currentView = "list";
        renderListView(container);
      }
    }

    // ---- List view: recording controls + session list ----
    async function renderListView(container: HTMLDivElement): Promise<void> {
      clearChildren(container);

      // Recording controls
      const controls = h("div", {
        display: "flex",
        gap: "8px",
        "margin-bottom": "12px",
      });

      if (recorder.isActive()) {
        const stopBtn = createButton(
          "Stop Recording",
          handleStopRecording,
          "primary",
        );
        const recordStatus = h("div", {
          display: "flex",
          "align-items": "center",
          gap: "6px",
          flex: "1",
          color: "#ef4444",
          "font-size": "12px",
        });

        const pulse = h("span", {
          width: "8px",
          height: "8px",
          "border-radius": "50%",
          background: "#ef4444",
          display: "inline-block",
        });
        const countLabel = h("span", {});
        countLabel.textContent = `Recording... ${recorder.getEventCount()} events`;

        recordStatus.append(pulse, countLabel);
        controls.append(recordStatus, stopBtn);

        // Update count periodically
        if (recordingInterval) clearInterval(recordingInterval);
        recordingInterval = setInterval(() => {
          if (disposed || !recorder.isActive()) {
            if (recordingInterval) clearInterval(recordingInterval);
            return;
          }
          countLabel.textContent = `Recording... ${recorder.getEventCount()} events`;
        }, 500);
      } else {
        const recordBtn = createButton(
          "Start Recording",
          handleStartRecording,
          "primary",
        );
        controls.appendChild(recordBtn);
      }

      container.appendChild(controls);

      // Session list
      const listHeader = h("div", {
        "font-weight": "600",
        "font-size": "12px",
        color: "#94a3b8",
        "margin-bottom": "8px",
      });
      listHeader.textContent = "Saved Sessions";
      container.appendChild(listHeader);

      try {
        const sessions = await storage.getSessions();
        if (sessions.length === 0) {
          const empty = h("div", {
            "text-align": "center",
            padding: "32px 16px",
            color: "#64748b",
            "font-size": "13px",
          });
          empty.textContent =
            'No sessions recorded yet. Click "Start Recording" to begin.';
          container.appendChild(empty);
        } else {
          const list = h("div", {
            display: "flex",
            "flex-direction": "column",
            gap: "6px",
          });

          for (const session of sessions) {
            list.appendChild(buildSessionRow(session));
          }
          container.appendChild(list);
        }
      } catch (_err) {
        const errorEl = h("div", {
          color: "#ef4444",
          "font-size": "12px",
          padding: "12px",
        });
        errorEl.textContent = "Failed to load sessions.";
        container.appendChild(errorEl);
      }
    }

    function buildSessionRow(session: SessionRecording): HTMLElement {
      const row = h("div", {
        display: "flex",
        "align-items": "center",
        gap: "8px",
        padding: "8px 10px",
        background: "#1e293b",
        border: "1px solid #334155",
        "border-radius": "6px",
        cursor: "pointer",
        "pointer-events": "auto",
      });

      // Event count badge
      const badge = h("span", {
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        "min-width": "28px",
        height: "28px",
        "border-radius": "50%",
        background: "#3b82f620",
        color: "#3b82f6",
        "font-size": "11px",
        "font-weight": "600",
        "flex-shrink": "0",
      });
      badge.textContent = String(session.events.length);

      const info = h("div", { flex: "1", "min-width": "0" });
      const nameEl = h("div", {
        "font-size": "12px",
        "font-weight": "500",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "white-space": "nowrap",
      });
      nameEl.textContent = session.name;

      const meta = h("div", { "font-size": "10px", color: "#64748b" });
      const duration = formatDuration(session.duration);
      const date = new Date(session.startTime).toLocaleString();
      meta.textContent = `${session.events.length} events · ${duration} · ${date}`;
      info.append(nameEl, meta);

      // Play button
      const playBtn = createButton("Play", () => openPlayer(session.id));
      playBtn.style.padding = "4px 10px";
      playBtn.style.fontSize = "11px";

      // Export button
      const exportBtn = createButton("Export", () => exportSession(session));
      exportBtn.style.padding = "4px 10px";
      exportBtn.style.fontSize = "11px";

      // Delete button
      const deleteBtn = createButton("Delete", async () => {
        await storage.deleteSession(session.id);
        renderView(panel!.getContainer());
      });
      deleteBtn.style.padding = "4px 10px";
      deleteBtn.style.fontSize = "11px";
      deleteBtn.style.background = "#991b1b";
      deleteBtn.style.borderColor = "#dc2626";

      row.append(badge, info, playBtn, exportBtn, deleteBtn);
      return row;
    }

    // ---- Player view ----
    async function renderPlayerView(container: HTMLDivElement): Promise<void> {
      clearChildren(container);

      const session = await storage.getSession(selectedSessionId!);
      if (!session) {
        currentView = "list";
        renderListView(container);
        return;
      }

      // Stop any existing playback
      stopPlayback();

      // Back button
      const backBtn = createButton("Back to Sessions", () => {
        stopPlayback();
        currentView = "list";
        selectedSessionId = null;
        renderView(panel!.getContainer());
      });
      backBtn.style.marginBottom = "8px";
      container.appendChild(backBtn);

      // Session info header
      const infoHeader = h("div", {
        "margin-bottom": "12px",
        padding: "8px 10px",
        background: "#1e293b",
        "border-radius": "6px",
      });

      const sessionName = h("div", {
        "font-weight": "600",
        "font-size": "13px",
        "margin-bottom": "4px",
      });
      sessionName.textContent = session.name;

      const sessionMeta = h("div", {
        "font-size": "10px",
        color: "#64748b",
      });
      sessionMeta.textContent = `${session.events.length} events · ${formatDuration(session.duration)} · ${new Date(session.startTime).toLocaleString()}`;

      infoHeader.append(sessionName, sessionMeta);
      container.appendChild(infoHeader);

      // Timeline scrubber
      const timeline = buildTimeline(session);
      container.appendChild(timeline);

      // Playback controls
      const controls = h("div", {
        display: "flex",
        "align-items": "center",
        gap: "8px",
        "margin-bottom": "12px",
      });

      const playPauseBtn = createButton(
        "Play",
        () => {
          if (isPlaying) {
            pausePlayback();
            playPauseBtn.textContent = "Play";
          } else {
            startPlayback(session);
            playPauseBtn.textContent = "Pause";
          }
        },
        "primary",
      );
      playPauseBtn.style.padding = "6px 14px";

      const resetBtn = createButton("Reset", () => {
        stopPlayback();
        playbackIndex = 0;
        playbackProgress = 0;
        playPauseBtn.textContent = "Play";
        updateTimelinePosition(timeline, 0);
        renderEventList(eventListContainer, session, 0);
      });
      resetBtn.style.padding = "6px 10px";

      // Speed selector
      const speedLabel = h("span", {
        "font-size": "11px",
        color: "#94a3b8",
      });
      speedLabel.textContent = "Speed:";

      const speedBtns = h("div", {
        display: "flex",
        gap: "4px",
      });

      for (const opt of SPEED_OPTIONS) {
        const speedBtn = createButton(opt.label, () => {
          playbackSpeed = opt.value;
          // Update active style
          for (const child of Array.from(speedBtns.children)) {
            (child as HTMLButtonElement).style.background = "#334155";
            (child as HTMLButtonElement).style.color = "#94a3b8";
          }
          (speedBtn as HTMLButtonElement).style.background = "#3b82f6";
          (speedBtn as HTMLButtonElement).style.color = "#fff";
        });
        speedBtn.style.padding = "3px 8px";
        speedBtn.style.fontSize = "10px";
        speedBtn.style.background = opt.value === 1 ? "#3b82f6" : "#334155";
        speedBtn.style.color = opt.value === 1 ? "#fff" : "#94a3b8";
        speedBtns.appendChild(speedBtn);
      }

      // Time display
      const timeDisplay = h("span", {
        "font-size": "11px",
        color: "#64748b",
        "font-family": "'SF Mono', monospace",
        "margin-left": "auto",
      });
      timeDisplay.textContent = "0:00 / " + formatDuration(session.duration);

      controls.append(
        playPauseBtn,
        resetBtn,
        speedLabel,
        speedBtns,
        timeDisplay,
      );
      container.appendChild(controls);

      // Event list (scrollable)
      const eventListContainer = h("div", {
        "max-height": "300px",
        "overflow-y": "auto",
        display: "flex",
        "flex-direction": "column",
        gap: "4px",
      });

      renderEventList(eventListContainer, session, 0);
      container.appendChild(eventListContainer);

      // Store references for playback
      storePlaybackRefs(
        playPauseBtn,
        timeDisplay,
        timeline,
        eventListContainer,
        session,
      );
    }

    // ---- Timeline ----
    function buildTimeline(session: SessionRecording): HTMLElement {
      const wrapper = h("div", {
        position: "relative",
        height: "40px",
        background: "#0c1222",
        "border-radius": "6px",
        "margin-bottom": "8px",
        cursor: "pointer",
        "pointer-events": "auto",
        overflow: "hidden",
      });

      // Track bar
      const track = h("div", {
        position: "absolute",
        bottom: "8px",
        left: "8px",
        right: "8px",
        height: "4px",
        background: "#334155",
        "border-radius": "2px",
      });

      // Progress fill
      const progress = h("div", {
        position: "absolute",
        top: "0",
        left: "0",
        width: "0%",
        height: "100%",
        background: "#3b82f6",
        "border-radius": "2px",
        transition: "width 0.1s linear",
      });
      progress.id = "fdh-timeline-progress";
      track.appendChild(progress);

      // Event dots
      const totalDuration = Math.max(session.duration, 1);
      for (let i = 0; i < session.events.length; i++) {
        const evt = session.events[i];
        const config = EVENT_CONFIG[evt.type];
        const pct = (evt.timestamp / totalDuration) * 100;

        const dot = h("div", {
          position: "absolute",
          bottom: "1px",
          left: `${Math.min(pct, 100)}%`,
          width: "6px",
          height: "6px",
          "border-radius": "50%",
          background: config.color,
          transform: "translateX(-3px)",
          cursor: "pointer",
          "pointer-events": "auto",
          title: `${config.label} at ${formatTimestamp(evt.timestamp)}`,
        });
        dot.title = `${config.label} at ${formatTimestamp(evt.timestamp)}`;
        track.appendChild(dot);
      }

      wrapper.appendChild(track);

      // Click to scrub
      wrapper.addEventListener("click", (e: MouseEvent) => {
        const rect = track.getBoundingClientRect();
        const pct = Math.max(
          0,
          Math.min(1, (e.clientX - rect.left) / rect.width),
        );
        const targetTime = pct * totalDuration;

        // Find the event index closest to this time
        playbackIndex = findEventIndexAtTime(session, targetTime);
        playbackProgress = pct * 100;
        updateTimelinePosition(wrapper, playbackProgress);
        renderEventList(
          (wrapper.parentElement?.querySelector(
            ".fdh-event-list",
          ) as HTMLElement) || wrapper,
          session,
          playbackIndex,
        );
      });

      return wrapper;
    }

    function updateTimelinePosition(timeline: HTMLElement, pct: number): void {
      const progress = timeline.querySelector(
        "#fdh-timeline-progress",
      ) as HTMLElement;
      if (progress) {
        progress.style.width = `${pct}%`;
      }
    }

    // ---- Event list ----
    function renderEventList(
      container: HTMLElement,
      session: SessionRecording,
      highlightIndex: number,
    ): void {
      clearChildren(container);

      if (session.events.length === 0) {
        const empty = h("div", {
          "text-align": "center",
          padding: "16px",
          color: "#64748b",
          "font-size": "12px",
        });
        empty.textContent = "No events in this session.";
        container.appendChild(empty);
        return;
      }

      for (let i = 0; i < session.events.length; i++) {
        const evt = session.events[i];
        const isHighlighted = i <= highlightIndex;
        const isCurrent = i === highlightIndex;
        container.appendChild(buildEventRow(evt, i, isHighlighted, isCurrent));
      }

      // Auto-scroll to current event
      const currentEl = container.querySelector('[data-current="true"]');
      if (currentEl) {
        currentEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    function buildEventRow(
      evt: SessionEvent,
      index: number,
      isHighlighted: boolean,
      isCurrent: boolean,
    ): HTMLElement {
      const config = EVENT_CONFIG[evt.type];

      const row = h("div", {
        display: "flex",
        "align-items": "flex-start",
        gap: "8px",
        padding: "6px 8px",
        "border-radius": "4px",
        background: isCurrent
          ? "#1e1b4b"
          : isHighlighted
            ? "#1e293b"
            : "#0c1222",
        border: isCurrent ? "1px solid #3b82f6" : "1px solid transparent",
        opacity: isHighlighted ? "1" : "0.5",
        transition: "opacity 0.15s, background 0.15s",
        "pointer-events": "auto",
        cursor: "default",
      });

      if (isCurrent) {
        row.setAttribute("data-current", "true");
      }

      // Type indicator
      const indicator = h("span", {
        display: "inline-flex",
        "align-items": "center",
        "justify-content": "center",
        width: "20px",
        height: "20px",
        "border-radius": "50%",
        background: `${config.color}20`,
        color: config.color,
        "font-size": "10px",
        "flex-shrink": "0",
        "margin-top": "1px",
      });
      indicator.textContent = config.icon;

      const content = h("div", { flex: "1", "min-width": "0" });

      const header = h("div", {
        display: "flex",
        "align-items": "center",
        gap: "6px",
        "margin-bottom": "2px",
      });

      const typeLabel = h("span", {
        "font-size": "11px",
        "font-weight": "500",
        color: config.color,
      });
      typeLabel.textContent = config.label;

      const timeLabel = h("span", {
        "font-size": "10px",
        color: "#64748b",
        "font-family": "'SF Mono', monospace",
      });
      timeLabel.textContent = formatTimestamp(evt.timestamp);

      header.append(typeLabel, timeLabel);
      content.appendChild(header);

      // Data summary
      const summary = h("div", {
        "font-size": "10px",
        color: "#94a3b8",
        overflow: "hidden",
        "text-overflow": "ellipsis",
        "white-space": "nowrap",
      });
      summary.textContent = summarizeEventData(evt);
      content.appendChild(summary);

      // Index label
      const indexLabel = h("span", {
        "font-size": "10px",
        color: "#475569",
        "font-family": "'SF Mono', monospace",
        "flex-shrink": "0",
      });
      indexLabel.textContent = `#${index + 1}`;

      row.append(indicator, content, indexLabel);
      return row;
    }

    // ---- Playback logic ----
    let refsPlayback: {
      playPauseBtn: HTMLButtonElement | null;
      timeDisplay: HTMLElement | null;
      timeline: HTMLElement | null;
      eventList: HTMLElement | null;
      session: SessionRecording | null;
    } = {
      playPauseBtn: null,
      timeDisplay: null,
      timeline: null,
      eventList: null,
      session: null,
    };

    function storePlaybackRefs(
      playPauseBtn: HTMLButtonElement,
      timeDisplay: HTMLElement,
      timeline: HTMLElement,
      eventList: HTMLElement,
      session: SessionRecording,
    ): void {
      refsPlayback = {
        playPauseBtn,
        timeDisplay,
        timeline,
        eventList,
        session,
      };
      // Tag the event list for scrub lookup
      eventList.classList.add("fdh-event-list");
    }

    function startPlayback(session: SessionRecording): void {
      if (isPlaying) return;
      isPlaying = true;
      scheduleNextEvent(session);
    }

    function scheduleNextEvent(session: SessionRecording): void {
      if (!isPlaying || disposed) return;
      if (playbackIndex >= session.events.length) {
        isPlaying = false;
        if (refsPlayback.playPauseBtn) {
          refsPlayback.playPauseBtn.textContent = "Play";
        }
        return;
      }

      const currentEvent = session.events[playbackIndex];
      const nextEvent = session.events[playbackIndex + 1];

      // Update UI
      const totalDuration = Math.max(session.duration, 1);
      playbackProgress = (currentEvent.timestamp / totalDuration) * 100;

      if (refsPlayback.timeline) {
        updateTimelinePosition(refsPlayback.timeline, playbackProgress);
      }
      if (refsPlayback.timeDisplay) {
        refsPlayback.timeDisplay.textContent =
          formatTimestamp(currentEvent.timestamp) +
          " / " +
          formatDuration(session.duration);
      }
      if (refsPlayback.eventList && refsPlayback.session) {
        renderEventList(
          refsPlayback.eventList,
          refsPlayback.session,
          playbackIndex,
        );
      }

      playbackIndex++;

      if (nextEvent) {
        const delay = Math.max(
          1,
          (nextEvent.timestamp - currentEvent.timestamp) / playbackSpeed,
        );
        playbackTimer = setTimeout(() => {
          scheduleNextEvent(session);
        }, delay);
      } else {
        // Last event
        isPlaying = false;
        if (refsPlayback.playPauseBtn) {
          refsPlayback.playPauseBtn.textContent = "Play";
        }
      }
    }

    function pausePlayback(): void {
      isPlaying = false;
      if (playbackTimer !== null) {
        clearTimeout(playbackTimer);
        playbackTimer = null;
      }
    }

    function stopPlayback(): void {
      isPlaying = false;
      if (playbackTimer !== null) {
        clearTimeout(playbackTimer);
        playbackTimer = null;
      }
      playbackIndex = 0;
      playbackProgress = 0;
    }

    // ---- Recording handlers ----
    function handleStartRecording(): void {
      recorder.start();
      renderView(panel!.getContainer());

      // Simulate recording a page navigation event
      recorder.recordEvent("page-navigation", {
        url: window.location.href,
        title: document.title,
      });

      // Tool activations — only recorded when the user has the toggle on.
      if (recordTools) {
        const onToolActivated = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          recorder.recordEvent("tool-activated", {
            toolId: detail?.toolId || "unknown",
            toolName: detail?.toolName || "Unknown",
          });
        };

        const onToolDeactivated = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          recorder.recordEvent("tool-deactivated", {
            toolId: detail?.toolId || "unknown",
            toolName: detail?.toolName || "Unknown",
          });
        };

        document.addEventListener("fdh-tool-activated", onToolActivated);
        document.addEventListener("fdh-tool-deactivated", onToolDeactivated);

        // Store listeners for cleanup
        (recorder as any as Record<string, unknown>)._cleanupListeners =
          () => {
            document.removeEventListener("fdh-tool-activated", onToolActivated);
            document.removeEventListener(
              "fdh-tool-deactivated",
              onToolDeactivated,
            );
          };
      }

      // Element selection events — gated by recordElementSelection.
      if (recordElementSelection) {
        const onElementSelected = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          recorder.recordEvent("element-selected", {
            selector: detail?.selector || "",
            tag: detail?.tag || "",
          });
        };
        document.addEventListener("fdh-element-selected", onElementSelected);
        const prevCleanup = (recorder as any as Record<string, unknown>)
          ._cleanupListeners as (() => void) | undefined;
        (recorder as any as Record<string, unknown>)._cleanupListeners =
          () => {
            prevCleanup?.();
            document.removeEventListener(
              "fdh-element-selected",
              onElementSelected,
            );
          };
      }

      // AI message events — gated by recordAIMessages.
      if (recordAIMessages) {
        const onAIMessage = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          recorder.recordEvent("ai-message", {
            role: detail?.role || "user",
            preview: String(detail?.content || "").slice(0, 200),
          });
        };
        document.addEventListener("fdh-ai-message", onAIMessage);
        const prevCleanup = (recorder as any as Record<string, unknown>)
          ._cleanupListeners as (() => void) | undefined;
        (recorder as any as Record<string, unknown>)._cleanupListeners =
          () => {
            prevCleanup?.();
            document.removeEventListener("fdh-ai-message", onAIMessage);
          };
      }

      // Reference maxThumbnailSize via a CSS custom property consumed by the
      // player view's screenshot thumbnails. This keeps the config live.
      panel
        ?.getContainer()
        .style.setProperty("--fdh-thumb-size", `${maxThumbnailSize}px`);
    }

    async function handleStopRecording(): Promise<void> {
      // Cleanup listeners
      const cleanupListeners = (recorder as any as Record<string, unknown>)
        ._cleanupListeners as (() => void) | undefined;
      if (cleanupListeners) cleanupListeners();

      const session = recorder.stop();
      if (session) {
        await storage.saveSession(session);
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
      }
      renderView(panel!.getContainer());
    }

    // ---- Navigation ----
    function openPlayer(sessionId: string): void {
      selectedSessionId = sessionId;
      currentView = "player";
      stopPlayback();
      renderView(panel!.getContainer());
    }

    // ---- Export ----
    function exportSession(session: SessionRecording): void {
      const json = JSON.stringify(session, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${session.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    // ---- Helpers ----
    function formatDuration(ms: number): string {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    function formatTimestamp(ms: number): string {
      const totalSeconds = ms / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      const millis = Math.floor(ms % 1000);
      return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
    }

    function summarizeEventData(evt: SessionEvent): string {
      const entries = Object.entries(evt.data);
      if (entries.length === 0) return "(no data)";
      return entries
        .map(([k, v]) => `${k}: ${String(v).substring(0, 60)}`)
        .join(" · ");
    }

    function findEventIndexAtTime(
      session: SessionRecording,
      targetTime: number,
    ): number {
      for (let i = session.events.length - 1; i >= 0; i--) {
        if (session.events[i].timestamp <= targetTime) return i;
      }
      return 0;
    }

    // ---- Cleanup ----
    function cleanup(): void {
      if (disposed) return;
      disposed = true;
      stopPlayback();
      if (recorder.isActive()) {
        const cleanupListeners = (
          recorder as any as Record<string, unknown>
        )._cleanupListeners as (() => void) | undefined;
        if (cleanupListeners) cleanupListeners();
        recorder.stop();
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
      }
      panel?.destroy();
      panel = null;
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
