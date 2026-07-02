import { useSettingsStore } from "@/stores/use-settings-store";

/**
 * Local-only diagnostics buffer.
 *
 * Phase 1.4 (audit remediation): the previous `flushTelemetry()` shipped a
 * commented-out `fetch('https://analytics.example.com/collect')` — i.e. the
 * Settings "Usage telemetry" toggle was a no-op from the user's perspective
 * (events accumulated locally forever and were never sent anywhere). Rather
 * than ship a half-truth, this module is now explicitly local-only: events
 * are buffered in chrome.storage.local so the user (and only the user) can
 * inspect them via `getTelemetryEvents()`. No network call is ever made.
 *
 * If/when a real provider is chosen (Posthog / Plausible / Vercel — see
 * MASTER_PLAN_EXT.md → Phase 2.5), it will be wired behind the existing
 * `enableTelemetry` opt-in flag with a separate explicit network consent
 * prompt. Until then, the toggle's label in the Settings panel is
 * "Local diagnostics (no network)".
 */

export interface TelemetryEvent {
  name: string;
  data?: Record<string, number | string | boolean>;
  timestamp: number;
}

const STORAGE_KEY = "fdh-telemetry";
const MAX_EVENTS = 200;

async function getStoredEvents(): Promise<TelemetryEvent[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as TelemetryEvent[] | undefined) ?? [];
}

async function setStoredEvents(events: TelemetryEvent[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: events });
}

export async function trackEvent(
  name: string,
  data?: Record<string, number | string | boolean>,
): Promise<void> {
  const enableTelemetry = useSettingsStore.getState().enableTelemetry;
  if (!enableTelemetry) return;

  const event: TelemetryEvent = {
    name,
    data,
    timestamp: Date.now(),
  };

  const events = await getStoredEvents();
  events.push(event);

  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  await setStoredEvents(events);
}

/**
 * Local-only flush. Trims the buffer back to MAX_EVENTS but makes NO network
 * request — see the file-level docstring. Kept as an export so a future
 * provider integration (Phase 2.5) can plug in here without touching callers.
 */
export async function flushTelemetry(): Promise<void> {
  const enableTelemetry = useSettingsStore.getState().enableTelemetry;
  if (!enableTelemetry) return;

  const events = await getStoredEvents();
  if (events.length === 0) return;

  // No network — local diagnostics only. Trim to the cap so the buffer can't
  // grow unbounded between user inspections.
  if (events.length > MAX_EVENTS) {
    await setStoredEvents(events.slice(-MAX_EVENTS));
  }
}

export async function getTelemetryEvents(): Promise<TelemetryEvent[]> {
  return getStoredEvents();
}

export async function clearTelemetry(): Promise<void> {
  await setStoredEvents([]);
}

/**
 * Surface the current mode to the Settings panel and any future UI that wants
 * to render a banner. Returns 'disabled' | 'local' — never 'network' until a
 * provider is wired in Phase 2.5.
 */
export function getTelemetryStatus(): "disabled" | "local" {
  return useSettingsStore.getState().enableTelemetry ? "local" : "disabled";
}
