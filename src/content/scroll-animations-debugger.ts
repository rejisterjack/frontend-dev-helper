/**
 * Scroll-Driven Animations Debugger
 *
 * Debug CSS scroll-driven animations:
 * - Detect animation-timeline: scroll() and view() usage
 * - Visual timeline scrubber overlay
 * - Show animation progress in real-time
 * - Highlight scroll-linked elements
 */

import { logger } from '@/utils/logger';
import { walkElementsEfficiently } from '@/utils/dom-performance';
import { TimerManager } from '@/utils/timer-manager';

interface ScrollAnimationInfo {
  element: HTMLElement;
  animationName: string;
  timelineType: 'scroll' | 'view' | 'unknown';
  axis?: 'block' | 'inline' | 'x' | 'y';
  source?: 'nearest' | 'root' | 'self';
  animationRange?: { start: string; end: string };
  currentProgress: number;
}

// State
let isActive = false;
let overlay: HTMLElement | null = null;
let animationOverlays: Map<HTMLElement, HTMLElement> = new Map();
const timers = new TimerManager();

/**
 * Check if Scroll-driven Animations API is supported
 */
export function isSupported(): boolean {
  return CSS.supports('animation-timeline', 'scroll()') ||
         CSS.supports('animation-timeline', 'view()');
}

/**
 * Detect all scroll-driven animations on the page
 */
function detectScrollAnimations(): ScrollAnimationInfo[] {
  const animations: ScrollAnimationInfo[] = [];

  walkElementsEfficiently(
    document,
    (el) => {
    const element = el as HTMLElement;
    const computedStyle = window.getComputedStyle(element);
    const animationTimeline = computedStyle.getPropertyValue('animation-timeline').trim();

    // Check for scroll() or view() timeline
    if (animationTimeline && (animationTimeline.includes('scroll') || animationTimeline.includes('view'))) {
      const animationName = computedStyle.animationName;
      const timelineType: ScrollAnimationInfo['timelineType'] = animationTimeline.includes('view') ? 'view' : 'scroll';

      // Parse animation-timeline value
      const axis = parseAxis(animationTimeline);
      const source = parseSource(animationTimeline);

      // Get animation range if specified
      const animationRangeRaw = computedStyle.getPropertyValue('animation-range').trim();
      const range =
        animationRangeRaw && animationRangeRaw !== 'normal'
          ? parseRange(animationRangeRaw)
          : undefined;

      // Calculate current progress (approximation)
      const progress = calculateProgress(element, timelineType, axis, source);

      animations.push({
        element,
        animationName: animationName !== 'none' ? animationName : 'unknown',
        timelineType,
        axis,
        source,
        animationRange: range,
        currentProgress: progress,
      });
    }
    },
    (msg) => logger.log(msg)
  );

  return animations;
}

/**
 * Parse axis from animation-timeline value
 */
function parseAxis(timeline: string): ScrollAnimationInfo['axis'] {
  if (timeline.includes('inline')) return 'inline';
  if (timeline.includes('block')) return 'block';
  if (timeline.includes('x')) return 'x';
  if (timeline.includes('y')) return 'y';
  return 'block'; // default
}

/**
 * Parse source from animation-timeline value
 */
function parseSource(timeline: string): ScrollAnimationInfo['source'] {
  if (timeline.includes('root')) return 'root';
  if (timeline.includes('self')) return 'self';
  return 'nearest';
}

/**
 * Parse animation-range value
 */
function parseRange(range: string): { start: string; end: string } {
  const parts = range.split(' ');
  if (parts.length >= 2) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: range, end: 'normal' };
}

/**
 * Calculate current animation progress
 */
function calculateProgress(
  element: HTMLElement,
  type: ScrollAnimationInfo['timelineType'],
  axis?: ScrollAnimationInfo['axis'],
  source?: ScrollAnimationInfo['source']
): number {
  try {
    if (type === 'scroll') {
      const scrollSource = getScrollSource(element, source);
      if (!scrollSource) return 0;

      const root: HTMLElement =
        scrollSource === window ? document.documentElement : (scrollSource as HTMLElement);
      const isHorizontal = axis === 'inline' || axis === 'x';
      const scrollSize = isHorizontal
        ? root.scrollWidth - root.clientWidth
        : root.scrollHeight - root.clientHeight;
      const scrollPos = isHorizontal ? root.scrollLeft : root.scrollTop;

      return scrollSize > 0 ? Math.min(100, Math.max(0, (scrollPos / scrollSize) * 100)) : 0;
    } else if (type === 'view') {
      // For view timelines, calculate based on element position in viewport
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Progress based on how much of the element is in view
      const elementTop = rect.top;
      const elementBottom = rect.bottom;

      if (elementBottom < 0 || elementTop > viewportHeight) {
        return elementBottom < 0 ? 100 : 0;
      }

      const visibleRatio = (viewportHeight - elementTop) / (viewportHeight + rect.height);
      return Math.min(100, Math.max(0, visibleRatio * 100));
    }
  } catch {
    // Fallback
  }

  return 0;
}

/**
 * Get the scroll source element
 */
function getScrollSource(
  element: HTMLElement,
  source?: ScrollAnimationInfo['source']
): HTMLElement | Window | null {
  if (source === 'root') return window;
  if (source === 'self') return element;

  // Find nearest scrollable ancestor
  let current: HTMLElement | null = element.parentElement;
  while (current) {
    const style = window.getComputedStyle(current);
    if (style.overflow === 'auto' || style.overflow === 'scroll' ||
        style.overflowX === 'auto' || style.overflowX === 'scroll' ||
        style.overflowY === 'auto' || style.overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }

  return window;
}

/**
 * Create overlay for a scroll animation
 */
function createAnimationOverlay(info: ScrollAnimationInfo): HTMLElement {
  const rect = info.element.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const overlay = document.createElement('div');
  overlay.className = 'fdh-sa-overlay';
  overlay.style.cssText = `
    position: absolute;
    left: ${rect.left + scrollX}px;
    top: ${rect.top + scrollY}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid ${getTimelineColor(info.timelineType)};
    background: ${getTimelineColor(info.timelineType, 0.05)};
    pointer-events: none;
    z-index: 2147483646;
    box-sizing: border-box;
  `;

  // Label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: -22px;
    left: 0;
    background: ${getTimelineColor(info.timelineType)};
    color: #1e1e2e;
    padding: 3px 8px;
    font-size: 10px;
    font-family: monospace;
    border-radius: 4px 4px 0 0;
    white-space: nowrap;
    font-weight: 600;
  `;
  label.textContent = `${info.timelineType} • ${info.animationName}`;
  overlay.appendChild(label);

  // Progress bar
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    position: absolute;
    bottom: 4px;
    left: 4px;
    right: 4px;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
  `;

  const progressBar = document.createElement('div');
  progressBar.className = 'fdh-sa-progress';
  progressBar.style.cssText = `
    width: ${info.currentProgress}%;
    height: 100%;
    background: ${getTimelineColor(info.timelineType)};
    transition: width 0.1s linear;
  `;

  progressContainer.appendChild(progressBar);
  overlay.appendChild(progressContainer);

  // Progress text
  const progressText = document.createElement('div');
  progressText.className = 'fdh-sa-progress-text';
  progressText.style.cssText = `
    position: absolute;
    bottom: 14px;
    right: 4px;
    background: rgba(30, 30, 46, 0.9);
    color: #cdd6f4;
    padding: 2px 6px;
    font-size: 10px;
    font-family: monospace;
    border-radius: 3px;
  `;
  progressText.textContent = `${Math.round(info.currentProgress)}%`;
  overlay.appendChild(progressText);

  return overlay;
}

/**
 * Get color for timeline type
 */
function getTimelineColor(type: ScrollAnimationInfo['timelineType'], alpha = 1): string {
  const colors = {
    scroll: `rgba(250, 179, 135, ${alpha})`, // orange
    view: `rgba(166, 227, 161, ${alpha})`,   // green
    unknown: `rgba(180, 190, 254, ${alpha})`, // lavender
  };
  return colors[type];
}

/**
 * Create global timeline HUD
 */
function createTimelineHUD(animations: ScrollAnimationInfo[]): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'fdh-sa-hud';
  hud.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 12px;
    padding: 16px 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #cdd6f4;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    min-width: 300px;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #313244;
  `;

  const title = document.createElement('div');
  title.style.cssText = 'font-weight: 600;';
  title.textContent = 'Scroll Animations';

  const count = document.createElement('span');
  count.style.cssText = `
    background: #45475a;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
  `;
  count.textContent = String(animations.length);

  header.appendChild(title);
  header.appendChild(count);
  hud.appendChild(header);

  // Animation list
  animations.slice(0, 5).forEach((anim) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #313244;
    `;

    const colorIndicator = document.createElement('div');
    colorIndicator.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${getTimelineColor(anim.timelineType)};
      flex-shrink: 0;
    `;

    const info = document.createElement('div');
    info.style.cssText = 'flex: 1; min-width: 0;';

    const name = document.createElement('div');
    name.style.cssText = `
      font-family: monospace;
      font-size: 11px;
      color: #cdd6f4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    name.textContent = anim.animationName;

    const details = document.createElement('div');
    details.style.cssText = 'font-size: 10px; color: #6c7086;';
    details.textContent = `${anim.timelineType}(${anim.axis || 'block'})`;

    info.appendChild(name);
    info.appendChild(details);

    const progress = document.createElement('div');
    progress.style.cssText = `
      font-family: monospace;
      font-size: 11px;
      color: ${getTimelineColor(anim.timelineType)};
      font-weight: 600;
    `;
    progress.textContent = `${Math.round(anim.currentProgress)}%`;

    item.appendChild(colorIndicator);
    item.appendChild(info);
    item.appendChild(progress);

    hud.appendChild(item);
  });

  if (animations.length > 5) {
    const more = document.createElement('div');
    more.style.cssText = 'text-align: center; color: #6c7086; font-size: 11px; padding-top: 8px;';
    more.textContent = `+${animations.length - 5} more animations`;
    hud.appendChild(more);
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    color: #6c7086;
    font-size: 18px;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.textContent = '×';
  closeBtn.onclick = () => disable();
  hud.appendChild(closeBtn);

  return hud;
}

/**
 * Update all overlays
 */
function updateOverlays(): void {
  if (!isActive) return;

  // Remove existing overlays
  animationOverlays.forEach((overlay) => overlay.remove());
  animationOverlays.clear();

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Detect animations
  const animations = detectScrollAnimations();

  if (animations.length === 0) {
    // Show "no animations found" message
    const noAnimMsg = document.createElement('div');
    noAnimMsg.className = 'fdh-sa-no-animations';
    noAnimMsg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 12px;
      padding: 24px 32px;
      z-index: 2147483647;
      text-align: center;
      color: #6c7086;
    `;
    noAnimMsg.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 8px;">📜</div>
      <div style="font-weight: 600; color: #cdd6f4; margin-bottom: 4px;">No Scroll Animations Found</div>
      <div style="font-size: 12px;">No elements with animation-timeline detected</div>
    `;
    document.body.appendChild(noAnimMsg);
    animationOverlays.set(document.body, noAnimMsg);
    return;
  }

  // Create HUD
  overlay = createTimelineHUD(animations);
  document.body.appendChild(overlay);

  // Create element overlays
  animations.forEach((anim) => {
    const elOverlay = createAnimationOverlay(anim);
    document.body.appendChild(elOverlay);
    animationOverlays.set(anim.element, elOverlay);
  });
}

/**
 * Start progress updates
 */
function startProgressUpdates(): void {
  timers.setInterval(() => {
    if (!isActive) return;

    const animations = detectScrollAnimations();

    // Update progress bars
    animations.forEach((anim) => {
      const overlay = animationOverlays.get(anim.element);
      if (overlay) {
        const progressBar = overlay.querySelector('.fdh-sa-progress') as HTMLElement;
        const progressText = overlay.querySelector('.fdh-sa-progress-text') as HTMLElement;

        if (progressBar) {
          progressBar.style.width = `${anim.currentProgress}%`;
        }
        if (progressText) {
          progressText.textContent = `${Math.round(anim.currentProgress)}%`;
        }
      }
    });
  }, 50); // Update every 50ms for smooth animation
}

/**
 * Enable Scroll Animations Debugger
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  updateOverlays();
  startProgressUpdates();

  logger.log('[ScrollAnimationsDebugger] Enabled');
}

/**
 * Disable Scroll Animations Debugger
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Remove all overlays
  animationOverlays.forEach((overlay) => overlay.remove());
  animationOverlays.clear();

  if (overlay) {
    overlay.remove();
    overlay = null;
  }

  // Stop all pending timers
  timers.clearAll();

  logger.log('[ScrollAnimationsDebugger] Disabled');
}

/**
 * Toggle Scroll Animations Debugger
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; supported: boolean } {
  return { enabled: isActive, supported: isSupported() };
}

/**
 * Get animation summary
 */
export function getAnimationSummary(): {
  total: number;
  scrollTimelines: number;
  viewTimelines: number;
} {
  const animations = detectScrollAnimations();
  return {
    total: animations.length,
    scrollTimelines: animations.filter((a) => a.timelineType === 'scroll').length,
    viewTimelines: animations.filter((a) => a.timelineType === 'view').length,
  };
}

// Default export
export default {
  enable,
  disable,
  toggle,
  getState,
  getAnimationSummary,
  isSupported,
};
