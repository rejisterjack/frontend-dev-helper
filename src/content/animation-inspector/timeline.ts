/**
 * Animation Timeline Management
 *
 * Controls animation playback, speed, highlighting, and progress updates.
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import type { AnimationInfo } from './types';

// Store original animation states
export const originalStates = new Map<HTMLElement, Map<string, string>>();

// Module state (controlled by main module)
let animationsRef: AnimationInfo[] = [];
let isPausedRef = false;
let playbackSpeedRef = 1;
let highlightEnabledRef = false;
let selectedAnimationIdRef: string | null = null;
let updateInterval: number | null = null;

// Callbacks to notify main module
let onStateChange: (() => void) | null = null;
let onHighlightRequest: ((element: HTMLElement, id: string) => void) | null = null;

/**
 * Initialize timeline module with references to shared state
 */
export function initTimeline(
  animations: AnimationInfo[],
  isPaused: boolean,
  playbackSpeed: number,
  highlightEnabled: boolean,
  selectedAnimationId: string | null,
  callbacks: {
    onStateChange?: () => void;
    onHighlightRequest?: (element: HTMLElement, id: string) => void;
  }
): void {
  animationsRef = animations;
  isPausedRef = isPaused;
  playbackSpeedRef = playbackSpeed;
  highlightEnabledRef = highlightEnabled;
  selectedAnimationIdRef = selectedAnimationId;
  onStateChange = callbacks.onStateChange || null;
  onHighlightRequest = callbacks.onHighlightRequest || null;
}

/**
 * Update local state references
 */
export function updateTimelineState(
  animations: AnimationInfo[],
  isPaused: boolean,
  playbackSpeed: number,
  highlightEnabled: boolean,
  selectedAnimationId: string | null
): void {
  animationsRef = animations;
  isPausedRef = isPaused;
  playbackSpeedRef = playbackSpeed;
  highlightEnabledRef = highlightEnabled;
  selectedAnimationIdRef = selectedAnimationId;
}

/**
 * Get current playback speed
 */
export function getPlaybackSpeed(): number {
  return playbackSpeedRef;
}

/**
 * Set playback speed for all animations
 */
export function setPlaybackSpeed(speed: number): void {
  playbackSpeedRef = speed;

  // Update CSS animations speed
  document.documentElement.style.setProperty('--fdh-anim-speed', `${1 / speed}`);

  for (const anim of animationsRef) {
    anim.element.style.setProperty('animation-duration', `${anim.duration / speed}ms`, 'important');
    anim.element.style.setProperty(
      'transition-duration',
      `${anim.duration / speed}ms`,
      'important'
    );
  }

  // Update Web Animations API speed
  walkElementsEfficiently(
    document,
    (el) => {
      const webAnimations =
        (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
      for (const anim of webAnimations) {
        anim.playbackRate = speed;
      }
    },
    (msg) => logger.log(msg)
  );

  onStateChange?.();
}

/**
 * Pause all animations
 */
export function pauseAllAnimations(): void {
  document.body.style.setProperty('--fdh-anim-play-state', 'paused');

  for (const anim of animationsRef) {
    if (anim.type === 'css-animation') {
      anim.element.style.animationPlayState = 'paused';
    }
    (anim.element as HTMLElement).style.setProperty('animation-play-state', 'paused', 'important');
  }

  // Pause Web Animations API animations
  walkElementsEfficiently(
    document,
    (el) => {
      const webAnimations =
        (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
      for (const anim of webAnimations) {
        if (anim.playState === 'running') {
          anim.pause();
        }
      }
    },
    (msg) => logger.log(msg)
  );

  isPausedRef = true;
  onStateChange?.();
}

/**
 * Play all animations
 */
export function playAllAnimations(): void {
  document.body.style.setProperty('--fdh-anim-play-state', 'running');

  for (const anim of animationsRef) {
    if (anim.type === 'css-animation') {
      anim.element.style.animationPlayState = 'running';
    }
    (anim.element as HTMLElement).style.setProperty('animation-play-state', 'running', 'important');
  }

  // Play Web Animations API animations
  walkElementsEfficiently(
    document,
    (el) => {
      const webAnimations =
        (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
      for (const anim of webAnimations) {
        if (anim.playState === 'paused') {
          anim.play();
        }
      }
    },
    (msg) => logger.log(msg)
  );

  isPausedRef = false;
  onStateChange?.();
}

/**
 * Pause specific animation
 */
export function pauseAnimation(animationId: string): void {
  const anim = animationsRef.find((a) => a.id === animationId);
  if (!anim) return;

  if (anim.type === 'css-animation') {
    // Store original state if not already stored
    if (!originalStates.has(anim.element)) {
      originalStates.set(anim.element, new Map());
    }
    const states = originalStates.get(anim.element);
    if (!states) return;
    if (!states.has('animationPlayState')) {
      states.set('animationPlayState', anim.element.style.animationPlayState);
    }

    anim.element.style.animationPlayState = 'paused';
  }

  anim.playState = 'paused';
  onStateChange?.();
}

/**
 * Play specific animation
 */
export function playAnimation(animationId: string): void {
  const anim = animationsRef.find((a) => a.id === animationId);
  if (!anim) return;

  if (anim.type === 'css-animation') {
    anim.element.style.animationPlayState = 'running';
  }

  anim.playState = 'running';
  onStateChange?.();
}

/**
 * Highlight an animated element
 */
export function highlightElement(element: HTMLElement, animationId: string): void {
  if (!highlightEnabledRef) return;

  // Remove previous highlights
  removeHighlights();

  // Add highlight to the element
  element.classList.add('fdh-anim-highlight');
  element.style.setProperty('outline', '3px solid #3b82f6', 'important');
  element.style.setProperty('outline-offset', '2px', 'important');
  element.style.setProperty('position', 'relative', 'important');

  // Scroll element into view if needed
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  selectedAnimationIdRef = animationId;
  onHighlightRequest?.(element, animationId);
  onStateChange?.();
}

/**
 * Remove all highlights
 */
export function removeHighlights(): void {
  const highlighted = document.querySelectorAll('.fdh-anim-highlight');
  for (const el of highlighted) {
    el.classList.remove('fdh-anim-highlight');
    (el as HTMLElement).style.removeProperty('outline');
    (el as HTMLElement).style.removeProperty('outline-offset');
  }
}

/**
 * Toggle highlight mode
 */
export function toggleHighlight(): boolean {
  highlightEnabledRef = !highlightEnabledRef;

  if (!highlightEnabledRef) {
    removeHighlights();
  } else if (selectedAnimationIdRef) {
    const anim = animationsRef.find((a) => a.id === selectedAnimationIdRef);
    if (anim) {
      highlightElement(anim.element, selectedAnimationIdRef);
    }
  }

  onStateChange?.();
  return highlightEnabledRef;
}

/**
 * Get highlight enabled state
 */
export function isHighlightEnabled(): boolean {
  return highlightEnabledRef;
}

/**
 * Get paused state
 */
export function isPausedState(): boolean {
  return isPausedRef;
}

/**
 * Start animation progress updates
 */
export function startProgressUpdates(
  onProgressUpdate?: (animations: AnimationInfo[]) => void
): void {
  if (updateInterval) return;

  updateInterval = window.setInterval(() => {
    if (isPausedRef) return;

    // Update progress for CSS animations
    for (const anim of animationsRef) {
      if (anim.type === 'css-animation') {
        // Try to get animation progress from Web Animations API
        const webAnims =
          (anim.element as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
        for (const wa of webAnims) {
          if (wa.effect && 'getComputedTiming' in wa.effect) {
            const timing = (
              wa.effect as AnimationEffect & { getComputedTiming: () => { progress?: number } }
            ).getComputedTiming();
            if (timing.progress !== undefined && timing.progress !== null) {
              anim.progress = timing.progress * 100;
            }
          }
        }
      }
    }

    onProgressUpdate?.(animationsRef);
  }, 100);

  logger.log('[AnimationInspector] Progress updates started');
}

/**
 * Stop animation progress updates
 */
export function stopProgressUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    logger.log('[AnimationInspector] Progress updates stopped');
  }
}

/**
 * Clear original states
 */
export function clearOriginalStates(): void {
  originalStates.clear();
}

/**
 * Restore original animation states
 */
export function restoreOriginalStates(): void {
  for (const [element, states] of originalStates) {
    const playState = states.get('animationPlayState');
    if (playState) {
      element.style.animationPlayState = playState;
    } else {
      element.style.removeProperty('animation-play-state');
    }
  }
  originalStates.clear();
}
