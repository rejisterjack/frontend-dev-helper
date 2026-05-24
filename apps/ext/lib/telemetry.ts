import { useSettingsStore } from '@/stores/use-settings-store';

interface TelemetryEvent {
  name: string;
  data?: Record<string, number | string | boolean>;
  timestamp: number;
}

const STORAGE_KEY = 'fdh-telemetry';
const MAX_EVENTS = 200;

async function getStoredEvents(): Promise<TelemetryEvent[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
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

  // Cap at MAX_EVENTS, removing oldest first
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }

  await setStoredEvents(events);
}

export async function flushTelemetry(): Promise<void> {
  const enableTelemetry = useSettingsStore.getState().enableTelemetry;
  if (!enableTelemetry) return;

  const events = await getStoredEvents();
  if (events.length === 0) return;

  // Stub: In production, send events to an analytics endpoint
  // Example:
  // await fetch('https://analytics.example.com/collect', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ events }),
  //   keepalive: true,
  // });

  console.debug('[FDH Telemetry] Flushing', events.length, 'events (stub)');

  // Clear events after successful flush
  await setStoredEvents([]);
}

export async function getTelemetryEvents(): Promise<TelemetryEvent[]> {
  return getStoredEvents();
}

export async function clearTelemetry(): Promise<void> {
  await setStoredEvents([]);
}
