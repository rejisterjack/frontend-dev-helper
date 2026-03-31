/**
 * Session Recording & Replay
 *
 * Record a sequence of tool activations and page interactions.
 * Save as a "debugging session" and share with teammates.
 */

import { logger } from '@/utils/logger';
import type { ToolId } from '@/constants';

export interface SessionEvent {
  id: string;
  timestamp: number;
  type: 'tool_enable' | 'tool_disable' | 'tool_toggle' | 'element_click' | 'scroll' | 'resize' | 'navigation' | 'annotation';
  data: Record<string, unknown>;
}

export interface DebuggingSession {
  id: string;
  name: string;
  description?: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  events: SessionEvent[];
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    duration: number;
    toolCount: number;
  };
  tags?: string[];
  shared?: boolean;
  shareId?: string;
  imported?: boolean;
}

interface RecordingState {
  isRecording: boolean;
  session: DebuggingSession | null;
  startTime: number;
  eventBuffer: SessionEvent[];
}

const state: RecordingState = {
  isRecording: false,
  session: null,
  startTime: 0,
  eventBuffer: [],
};

let clickListener: ((e: MouseEvent) => void) | null = null;
let scrollListener: (() => void) | null = null;
let resizeListener: (() => void) | null = null;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Start recording a new session
 */
export function startRecording(name: string, description?: string): DebuggingSession {
  if (state.isRecording) {
    throw new Error('Already recording');
  }

  state.isRecording = true;
  state.startTime = Date.now();
  state.eventBuffer = [];

  const session: DebuggingSession = {
    id: generateId(),
    name,
    description,
    url: window.location.href,
    title: document.title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    events: [],
    metadata: {
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      duration: 0,
      toolCount: 0,
    },
    tags: [],
  };

  state.session = session;

  // Set up event listeners
  setupEventListeners();

  // Record initial state
  recordEvent({
    id: generateId(),
    timestamp: 0,
    type: 'navigation',
    data: {
      url: window.location.href,
      title: document.title,
    },
  });

  showRecordingIndicator();

  logger.log('[SessionRecorder] Started recording:', name);
  return session;
}

/**
 * Stop recording
 */
export function stopRecording(): DebuggingSession | null {
  if (!state.isRecording || !state.session) {
    return null;
  }

  state.isRecording = false;
  const duration = Date.now() - state.startTime;

  state.session.events = [...state.eventBuffer];
  state.session.metadata.duration = duration;
  state.session.metadata.toolCount = countUniqueTools(state.eventBuffer);
  state.session.updatedAt = Date.now();

  // Clean up listeners
  removeEventListeners();
  hideRecordingIndicator();

  // Save to storage
  saveSession(state.session);

  logger.log('[SessionRecorder] Stopped recording:', state.session.name, `${duration}ms`);
  return state.session;
}

/**
 * Record an event
 */
export function recordEvent(event: Omit<SessionEvent, 'timestamp'> & { timestamp?: number }): void {
  if (!state.isRecording) return;

  const fullEvent: SessionEvent = {
    ...event,
    timestamp: event.timestamp ?? Date.now() - state.startTime,
    id: event.id || generateId(),
  };

  state.eventBuffer.push(fullEvent);

  // Limit buffer size
  if (state.eventBuffer.length > 1000) {
    state.eventBuffer = state.eventBuffer.slice(-500);
  }
}

/**
 * Record tool state change
 */
export function recordToolEvent(toolId: ToolId, enabled: boolean): void {
  recordEvent({
    id: generateId(),
    timestamp: Date.now() - state.startTime,
    type: enabled ? 'tool_enable' : 'tool_disable',
    data: { toolId, url: window.location.href },
  });
}

/**
 * Add annotation to current recording
 */
export function addAnnotation(text: string, elementSelector?: string): void {
  recordEvent({
    id: generateId(),
    timestamp: Date.now() - state.startTime,
    type: 'annotation',
    data: { text, selector: elementSelector },
  });
}

/**
 * Set up DOM event listeners
 */
function setupEventListeners(): void {
  // Click tracking
  clickListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    recordEvent({
      id: generateId(),
      timestamp: Date.now() - state.startTime,
      type: 'element_click',
      data: {
        tag: target.tagName,
        id: target.id,
        class: target.className,
        text: target.textContent?.slice(0, 100),
        x: e.clientX,
        y: e.clientY,
      },
    });
  };
  document.addEventListener('click', clickListener, true);

  // Scroll tracking (throttled)
  let scrollTimeout: number | null = null;
  scrollListener = () => {
    if (scrollTimeout) return;
    scrollTimeout = window.setTimeout(() => {
      recordEvent({
        id: generateId(),
        timestamp: Date.now() - state.startTime,
        type: 'scroll',
        data: {
          x: window.scrollX,
          y: window.scrollY,
        },
      });
      scrollTimeout = null;
    }, 500);
  };
  window.addEventListener('scroll', scrollListener, { passive: true });

  // Resize tracking
  resizeListener = () => {
    recordEvent({
      id: generateId(),
      timestamp: Date.now() - state.startTime,
      type: 'resize',
      data: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
  };
  window.addEventListener('resize', resizeListener);
}

/**
 * Remove event listeners
 */
function removeEventListeners(): void {
  if (clickListener) {
    document.removeEventListener('click', clickListener, true);
    clickListener = null;
  }
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener);
    scrollListener = null;
  }
  if (resizeListener) {
    window.removeEventListener('resize', resizeListener);
    resizeListener = null;
  }
}

/**
 * Show recording indicator UI
 */
function showRecordingIndicator(): void {
  const existing = document.getElementById('fdh-recording-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'fdh-recording-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #ef4444;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 600;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    animation: fdh-pulse 2s infinite;
  `;

  indicator.innerHTML = `
    <style>
      @keyframes fdh-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    </style>
    <span style="width: 8px; height: 8px; background: white; border-radius: 50%;"></span>
    <span>● REC</span>
    <span id="fdh-recording-time" style="font-family: monospace;">00:00</span>
    <button id="fdh-stop-recording" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-left: 8px;
    ">Stop</button>
  `;

  document.body.appendChild(indicator);

  // Update timer
  const timeDisplay = indicator.querySelector('#fdh-recording-time');
  const timer = setInterval(() => {
    if (!state.isRecording) {
      clearInterval(timer);
      return;
    }
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    if (timeDisplay) timeDisplay.textContent = `${mins}:${secs}`;
  }, 1000);

  // Stop button
  indicator.querySelector('#fdh-stop-recording')?.addEventListener('click', () => {
    stopRecording();
  });
}

/**
 * Hide recording indicator
 */
function hideRecordingIndicator(): void {
  document.getElementById('fdh-recording-indicator')?.remove();
}

/**
 * Count unique tools used in session
 */
function countUniqueTools(events: SessionEvent[]): number {
  const tools = new Set<string>();
  for (const event of events) {
    if (event.type === 'tool_enable' || event.type === 'tool_disable') {
      tools.add(event.data.toolId as string);
    }
  }
  return tools.size;
}

/**
 * Save session to storage
 */
async function saveSession(session: DebuggingSession): Promise<void> {
  const result = await chrome.storage.local.get('fdh_sessions');
  const sessions: DebuggingSession[] = result.fdh_sessions || [];
  sessions.unshift(session);

  // Keep only last 50 sessions
  if (sessions.length > 50) {
    sessions.length = 50;
  }

  await chrome.storage.local.set({ fdh_sessions: sessions });
}

/**
 * Get all saved sessions
 */
export async function getSessions(): Promise<DebuggingSession[]> {
  const result = await chrome.storage.local.get('fdh_sessions');
  return (result.fdh_sessions || []) as DebuggingSession[];
}

/**
 * Get a specific session
 */
export async function getSession(id: string): Promise<DebuggingSession | null> {
  const sessions = await getSessions();
  return sessions.find((s) => s.id === id) || null;
}

/**
 * Delete a session
 */
export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  await chrome.storage.local.set({ fdh_sessions: filtered });
}

/**
 * Replay a session
 */
export async function replaySession(sessionId: string, onEvent?: (event: SessionEvent, index: number) => void): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  logger.log('[SessionRecorder] Replaying session:', session.name);

  for (let i = 0; i < session.events.length; i++) {
    const event = session.events[i];

    // Wait for the timestamp
    if (i > 0) {
      const prevEvent = session.events[i - 1];
      const delay = event.timestamp - prevEvent.timestamp;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 1000))); // Cap at 1 second
      }
    }

    // Execute event
    await executeEvent(event);

    // Callback
    onEvent?.(event, i);
  }

  logger.log('[SessionRecorder] Replay complete');
}

/**
 * Execute a single event during replay
 */
async function executeEvent(event: SessionEvent): Promise<void> {
  switch (event.type) {
    case 'tool_enable':
      // Send message to enable tool
      chrome.runtime.sendMessage({
        type: 'TOGGLE_TOOL',
        payload: { toolId: event.data.toolId, enabled: true },
      });
      break;

    case 'tool_disable':
      chrome.runtime.sendMessage({
        type: 'TOGGLE_TOOL',
        payload: { toolId: event.data.toolId, enabled: false },
      });
      break;

    case 'navigation':
      if (window.location.href !== event.data.url) {
        window.location.href = event.data.url as string;
      }
      break;

    case 'scroll':
      window.scrollTo(event.data.x as number, event.data.y as number);
      break;

    case 'annotation':
      showAnnotation(event.data.text as string, event.data.selector as string);
      break;
  }
}

/**
 * Show annotation during replay
 */
function showAnnotation(text: string, selector?: string): void {
  let target: HTMLElement | null = null;

  if (selector) {
    try {
      target = document.querySelector(selector);
    } catch {
      // Invalid selector
    }
  }

  const annotation = document.createElement('div');
  annotation.style.cssText = `
    position: fixed;
    ${target ? 'absolute' : 'fixed'};
    ${target ? '' : 'top: 100px; left: 50%; transform: translateX(-50%);'}
    background: #f59e0b;
    color: #1e1e2e;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13px;
    font-weight: 500;
    z-index: 2147483647;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    animation: fdh-annotation-in 0.3s ease-out;
  `;
  annotation.textContent = text;

  if (target) {
    const rect = target.getBoundingClientRect();
    annotation.style.top = `${rect.bottom + 10}px`;
    annotation.style.left = `${rect.left}px`;
  }

  annotation.innerHTML += `
    <style>
      @keyframes fdh-annotation-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;

  document.body.appendChild(annotation);

  setTimeout(() => {
    annotation.style.opacity = '0';
    annotation.style.transition = 'opacity 0.5s';
    setTimeout(() => annotation.remove(), 500);
  }, 3000);
}

/**
 * Export session as JSON
 */
export function exportSession(session: DebuggingSession): string {
  return JSON.stringify(session, null, 2);
}

/**
 * Import session from JSON
 */
export function importSession(json: string): DebuggingSession {
  const session = JSON.parse(json) as DebuggingSession;
  session.id = generateId(); // Generate new ID
  session.imported = true;
  saveSession(session);
  return session;
}

/**
 * Share session (generate shareable link)
 */
export async function shareSession(sessionId: string): Promise<string> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  // In a real implementation, this would upload to a server
  // For now, we'll create a data URL
  const shareId = generateId();
  session.shared = true;
  session.shareId = shareId;

  await saveSession(session);

  // Return a data URL that can be shared
  const data = btoa(JSON.stringify(session));
  return `${window.location.origin}/session/${shareId}#${data}`;
}

/**
 * Get recording state
 */
export function getState(): { isRecording: boolean; currentSession: DebuggingSession | null } {
  return {
    isRecording: state.isRecording,
    currentSession: state.session,
  };
}

/**
 * Toggle recording
 */
export function toggle(name?: string): boolean {
  if (state.isRecording) {
    stopRecording();
    return false;
  } else {
    startRecording(name || `Session ${new Date().toLocaleString()}`);
    return true;
  }
}

// Default export
export default {
  startRecording,
  stopRecording,
  recordEvent,
  recordToolEvent,
  addAnnotation,
  getSessions,
  getSession,
  deleteSession,
  replaySession,
  exportSession,
  importSession,
  shareSession,
  getState,
  toggle,
};
