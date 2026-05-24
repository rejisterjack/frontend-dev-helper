export type SessionEventType =
  | 'tool-activated'
  | 'tool-deactivated'
  | 'element-selected'
  | 'ai-message'
  | 'screenshot-captured'
  | 'page-navigation'
  | 'annotation'
  | 'user-action';

export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface SessionRecording {
  id: string;
  name: string;
  url: string;
  events: SessionEvent[];
  startTime: number;
  endTime: number;
  duration: number;
  thumbnail?: string;
}

const AI_CONTENT_MAX_LENGTH = 100;
const THUMBNAIL_MAX_SIZE = 200;

export class SessionRecorder {
  private events: SessionEvent[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private name: string = '';
  private url: string = '';

  start(name?: string): void {
    this.events = [];
    this.startTime = Date.now();
    this.isRecording = true;
    this.name = name || `Session ${new Date().toLocaleString()}`;
    this.url = window.location.href;
  }

  stop(): SessionRecording | null {
    if (!this.isRecording) return null;
    this.isRecording = false;
    return this.exportSession();
  }

  recordEvent(type: SessionEventType, data: Record<string, unknown>): void {
    if (!this.isRecording) return;

    // Truncate AI content for performance
    const sanitized = this.sanitizeEventData(type, data);

    this.events.push({
      id: `evt_${Date.now()}_${this.events.length}`,
      type,
      timestamp: Date.now() - this.startTime,
      data: sanitized,
    });
  }

  getEventCount(): number {
    return this.events.length;
  }

  getDuration(): number {
    return this.isRecording ? Date.now() - this.startTime : 0;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  exportSession(): SessionRecording | null {
    if (this.events.length === 0) return null;
    return {
      id: `session_${this.startTime}`,
      name: this.name,
      url: this.url,
      events: [...this.events],
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
    };
  }

  private sanitizeEventData(
    type: SessionEventType,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (type === 'ai-message' && typeof value === 'string' && value.length > AI_CONTENT_MAX_LENGTH) {
        sanitized[key] = value.substring(0, AI_CONTENT_MAX_LENGTH) + '...';
      } else if (type === 'screenshot-captured' && key === 'thumbnail' && typeof value === 'string') {
        sanitized[key] = this.downscaleThumbnail(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private downscaleThumbnail(dataUrl: string): string {
    // Return as-is if it's not a data URL (performance: skip heavy processing)
    if (!dataUrl.startsWith('data:image')) return dataUrl;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_MAX_SIZE;
      canvas.height = THUMBNAIL_MAX_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;

      const img = new Image();
      img.src = dataUrl;
      ctx.drawImage(img, 0, 0, THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE);
      return canvas.toDataURL('image/jpeg', 0.6);
    } catch {
      return dataUrl;
    }
  }
}
