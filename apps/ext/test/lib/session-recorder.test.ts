import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRecorder } from '@/lib/session-recorder';

describe('SessionRecorder', () => {
  let recorder: SessionRecorder;

  beforeEach(() => {
    vi.clearAllMocks();
    recorder = new SessionRecorder();
  });

  it('creates instance, not recording initially', () => {
    expect(recorder.isActive()).toBe(false);
    expect(recorder.getEventCount()).toBe(0);
    expect(recorder.getDuration()).toBe(0);
  });

  it('start() begins recording', () => {
    recorder.start('Test Session');
    expect(recorder.isActive()).toBe(true);
  });

  it('recordEvent() adds event when recording', () => {
    recorder.start('Test Session');
    recorder.recordEvent('tool-activated', { toolId: 'dom-outliner' });
    recorder.recordEvent('element-selected', { selector: 'div.container' });

    expect(recorder.getEventCount()).toBe(2);
  });

  it('recordEvent() is no-op when not recording', () => {
    recorder.recordEvent('tool-activated', { toolId: 'dom-outliner' });
    expect(recorder.getEventCount()).toBe(0);
  });

  it('stop() returns SessionRecording with events', () => {
    recorder.start('Test Session');
    recorder.recordEvent('tool-activated', { toolId: 'dom-outliner' });
    recorder.recordEvent('element-selected', { selector: 'div.container' });

    const recording = recorder.stop();
    expect(recording).not.toBeNull();
    expect(recording!.events).toHaveLength(2);
    expect(recording!.name).toBe('Test Session');
    expect(recording!.events[0].type).toBe('tool-activated');
    expect(recording!.events[1].type).toBe('element-selected');
    expect(recording!.duration).toBeGreaterThanOrEqual(0);
    expect(recording!.url).toBeDefined();
  });

  it('stop() returns null when not recording', () => {
    const result = recorder.stop();
    expect(result).toBeNull();
  });

  it('exportSession() returns null with no events', () => {
    recorder.start('Empty Session');
    const result = recorder.exportSession();
    expect(result).toBeNull();
  });

  it('truncates long AI message content', () => {
    recorder.start('AI Test');
    const longContent = 'A'.repeat(200);
    recorder.recordEvent('ai-message', { content: longContent });

    const recording = recorder.stop();
    expect(recording).not.toBeNull();
    const eventData = recording!.events[0].data;
    // Content should be truncated to 100 chars + '...'
    expect((eventData.content as string).length).toBeLessThan(longContent.length);
    expect((eventData.content as string)).toContain('...');
  });

  it('uses default name when none provided', () => {
    recorder.start();
    recorder.recordEvent('user-action', { action: 'click' });
    const recording = recorder.stop();
    expect(recording).not.toBeNull();
    expect(recording!.name).toContain('Session');
  });
});
