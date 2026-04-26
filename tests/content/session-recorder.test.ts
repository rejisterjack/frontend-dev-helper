/**
 * Session Recorder Tests
 *
 * Tests the recording lifecycle (start/stop/toggle), event recording,
 * and state management for the session-recorder content script tool.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  startRecording,
  stopRecording,
  recordEvent,
  recordToolEvent,
  addAnnotation,
  getState,
  toggle,
  exportSession,
  importSession,
  getSessions,
  deleteSession,
} from '@/content/session-recorder';
import type { DebuggingSession } from '@/content/session-recorder';

describe('SessionRecorder', () => {
  beforeEach(() => {
    // Stop any active recording
    const { isRecording } = getState();
    if (isRecording) {
      stopRecording();
    }
    // Clean up indicator
    document.getElementById('fdh-recording-indicator')?.remove();
  });

  afterEach(() => {
    const { isRecording } = getState();
    if (isRecording) {
      stopRecording();
    }
  });

  // --- Lifecycle tests ---

  it('should start recording successfully', () => {
    const session = startRecording('Test Session');

    expect(getState().isRecording).toBe(true);
    expect(session).not.toBeNull();
    expect(session.name).toBe('Test Session');
    expect(session.id).toBeTruthy();
  });

  it('should stop recording successfully', () => {
    startRecording('Test Session');
    expect(getState().isRecording).toBe(true);

    const session = stopRecording();
    expect(getState().isRecording).toBe(false);
    expect(session).not.toBeNull();
    expect(session!.name).toBe('Test Session');
  });

  it('should return null when stopping with no active recording', () => {
    expect(getState().isRecording).toBe(false);
    const result = stopRecording();
    expect(result).toBeNull();
  });

  it('should toggle recording state', () => {
    expect(getState().isRecording).toBe(false);

    const started = toggle('Toggle Test');
    expect(started).toBe(true);
    expect(getState().isRecording).toBe(true);

    const stopped = toggle();
    expect(stopped).toBe(false);
    expect(getState().isRecording).toBe(false);
  });

  it('should return correct state via getState', () => {
    const stateBefore = getState();
    expect(stateBefore.isRecording).toBe(false);

    startRecording('State Test');
    const stateAfter = getState();
    expect(stateAfter.isRecording).toBe(true);
    expect(stateAfter.currentSession).not.toBeNull();
    expect(stateAfter.currentSession!.name).toBe('State Test');
  });

  it('should handle double-start by throwing error', () => {
    startRecording('First');
    expect(getState().isRecording).toBe(true);

    expect(() => startRecording('Second')).toThrow('Already recording');
  });

  it('should handle double-stop gracefully', () => {
    startRecording('Test');
    stopRecording();
    expect(getState().isRecording).toBe(false);

    // Second stop returns null (no error)
    const result = stopRecording();
    expect(result).toBeNull();
  });

  // --- Event recording ---

  it('should record events during recording', () => {
    startRecording('Event Test');

    recordEvent({
      id: 'test-event-1',
      type: 'navigation',
      data: { url: 'https://example.com' },
    });

    // Stop to finalize events
    const session = stopRecording();
    expect(session).not.toBeNull();
    expect(session!.events.length).toBeGreaterThan(0);
  });

  it('should not record events when not recording', () => {
    // Not recording — recordEvent should be a no-op
    expect(() => {
      recordEvent({
        id: 'ignored-event',
        type: 'navigation',
        data: { url: 'https://example.com' },
      });
    }).not.toThrow();
  });

  it('should record tool events', () => {
    startRecording('Tool Event Test');

    recordToolEvent('pesticide' as any, true);
    recordToolEvent('pesticide' as any, false);

    const session = stopRecording();
    expect(session).not.toBeNull();
    const toolEvents = session!.events.filter(
      (e) => e.type === 'tool_enable' || e.type === 'tool_disable'
    );
    expect(toolEvents.length).toBe(2);
  });

  it('should add annotations during recording', () => {
    startRecording('Annotation Test');

    addAnnotation('This is a note', '.my-selector');

    const session = stopRecording();
    expect(session).not.toBeNull();
    const annotations = session!.events.filter((e) => e.type === 'annotation');
    expect(annotations.length).toBe(1);
    expect(annotations[0].data.text).toBe('This is a note');
  });

  // --- DOM indicator ---

  it('should create recording indicator in DOM when enabled', () => {
    startRecording('Indicator Test');

    const indicator = document.getElementById('fdh-recording-indicator');
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain('REC');

    stopRecording();
  });

  it('should clean up DOM indicator on disable', () => {
    startRecording('Cleanup Test');
    expect(document.getElementById('fdh-recording-indicator')).not.toBeNull();

    stopRecording();
    expect(document.getElementById('fdh-recording-indicator')).toBeNull();
  });

  // --- Session metadata ---

  it('should populate session metadata', () => {
    const session = startRecording('Metadata Test');

    expect(session.url).toBe(window.location.href);
    expect(session.title).toBe(document.title);
    expect(session.metadata.viewport).toEqual({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    expect(session.metadata.userAgent).toBe(navigator.userAgent);

    stopRecording();
  });

  // --- Export / Import ---

  it('should export session as JSON', () => {
    startRecording('Export Test');
    recordEvent({
      id: 'export-event',
      type: 'navigation',
      data: { url: 'https://example.com' },
    });
    const session = stopRecording()!;

    const json = exportSession(session);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Export Test');
    expect(parsed.id).toBe(session.id);
  });

  it('should import session from JSON', () => {
    startRecording('Import Source');
    const original = stopRecording()!;
    const json = exportSession(original);

    const imported = importSession(json);
    expect(imported.name).toBe('Import Source');
    expect(imported.id).not.toBe(original.id); // New ID generated
    expect(imported.imported).toBe(true);
  });

  // --- Storage operations ---

  it('should persist sessions to storage', async () => {
    startRecording('Storage Test');
    const session = stopRecording();

    // Wait for async storage save
    await vi.waitFor(async () => {
      const sessions = await getSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  it('should delete a session', async () => {
    startRecording('Delete Test');
    const session = stopRecording()!;

    await vi.waitFor(async () => {
      const sessions = await getSessions();
      const found = sessions.find((s) => s.id === session.id);
      expect(found).toBeDefined();
    });

    await deleteSession(session.id);

    const sessions = await getSessions();
    expect(sessions.find((s) => s.id === session.id)).toBeUndefined();
  });
});
