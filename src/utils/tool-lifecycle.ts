/**
 * ToolLifecycle — centralized resource manager for content script tools.
 *
 * Tracks MutationObservers, PerformanceObservers, ResizeObservers,
 * DOM event listeners (via AbortController), timers, and arbitrary
 * cleanup functions so that a single `destroy()` call tears everything
 * down cleanly.
 */

import { TimerManager } from './timer-manager';

export class ToolLifecycle {
  private controller: AbortController | null = null;
  private observers: (MutationObserver | PerformanceObserver | ResizeObserver)[] = [];
  private timerManager = new TimerManager();
  private cleanups: (() => void)[] = [];

  start(): void {
    this.controller = new AbortController();
  }

  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, listener, {
      ...options,
      signal: this.controller?.signal,
    });
  }

  addObserver(observer: MutationObserver | PerformanceObserver | ResizeObserver): void {
    this.observers.push(observer);
  }

  setTimeout(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
    return this.timerManager.setTimeout(fn, ms);
  }

  setInterval(fn: () => void, ms: number): ReturnType<typeof setInterval> {
    return this.timerManager.setInterval(fn, ms);
  }

  addCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  destroy(): void {
    this.controller?.abort();
    this.controller = null;
    for (const o of this.observers) o.disconnect();
    this.observers = [];
    this.timerManager.clearAll();
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
  }
}
