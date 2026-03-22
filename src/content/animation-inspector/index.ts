/**
 * Animation Inspector
 *
 * Detects, visualizes, and controls CSS animations and transitions on the page.
 * Features: timeline view, play/pause controls, speed adjustment, element highlighting.
 */

import { logger } from '@/utils/logger';
import { detectAllAnimations } from './detector';
import {
  clearOriginalStates,
  getPlaybackSpeed,
  highlightElement,
  initTimeline,
  isHighlightEnabled,
  isPausedState,
  pauseAllAnimations as pauseAllTimelineAnimations,
  pauseAnimation,
  playAllAnimations as playAllTimelineAnimations,
  playAnimation,
  restoreOriginalStates,
  setPlaybackSpeed as setTimelinePlaybackSpeed,
  startProgressUpdates,
  stopProgressUpdates,
  toggleHighlight,
  updateTimelineState,
} from './timeline';
import type { AnimationInfo, AnimationState, AnimationType, PanelPosition } from './types';
import {
  createPanel as createUIPanel,
  getPanel,
  initUI,
  setPanel,
  updatePanel,
  updateProgressBar,
  updateUIState,
} from './ui';

// Re-export types
export type { AnimationInfo, AnimationState, AnimationType, PanelPosition };

// ============================================
// State
// ============================================

let isActive = false;
let animations: AnimationInfo[] = [];
let selectedAnimationId: string | null = null;
let playbackSpeed = 1;
let highlightEnabled = false;
let isPaused = false;

// ============================================
// Module Integration
// ============================================

/**
 * Sync state to timeline module
 */
function syncToTimeline(): void {
  updateTimelineState(animations, isPaused, playbackSpeed, highlightEnabled, selectedAnimationId);
}

/**
 * Sync state to UI module
 */
function syncToUI(): void {
  updateUIState(animations, isPaused, playbackSpeed, highlightEnabled, selectedAnimationId);
}

// ============================================
// UI Callbacks
// ============================================

const uiCallbacks = {
  onClose: () => disable(),
  onPlayPauseAll: () => {
    if (isPaused) {
      playAllAnimations();
    } else {
      pauseAllAnimations();
    }
  },
  onToggleHighlight: () => {
    highlightEnabled = toggleHighlight();
    syncToUI();
    updatePanel();
  },
  onSetSpeed: (speed: number) => {
    setPlaybackSpeed(speed);
  },
  onSelectAnimation: (id: string) => {
    const anim = animations.find((a) => a.id === id);
    if (anim) {
      selectedAnimationId = id;
      if (highlightEnabled) {
        highlightElement(anim.element, id);
      }
      syncToUI();
      syncToTimeline();
      updatePanel();
    }
  },
  onToggleAnimation: (id: string) => {
    const anim = animations.find((a) => a.id === id);
    if (!anim) return;

    if (anim.playState === 'running') {
      pauseAnimation(id);
    } else {
      playAnimation(id);
    }
    syncToUI();
    updatePanel();
  },
  onScrollToElement: (id: string) => {
    const anim = animations.find((a) => a.id === id);
    if (anim) {
      anim.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightElement(anim.element, id);
      selectedAnimationId = id;
      syncToUI();
      syncToTimeline();
      updatePanel();
    }
  },
  onRefresh: () => {
    animations = detectAllAnimations();
    if (isActive) {
      syncToUI();
      syncToTimeline();
      updatePanel();
    }
  },
};

// ============================================
// Timeline Callbacks
// ============================================

const timelineCallbacks = {
  onStateChange: () => {
    isPaused = isPausedState();
    playbackSpeed = getPlaybackSpeed();
    highlightEnabled = isHighlightEnabled();
    syncToUI();
    updatePanel();
  },
  onHighlightRequest: (_element: HTMLElement, id: string) => {
    selectedAnimationId = id;
    syncToUI();
  },
};

// ============================================
// Animation Control (Public API)
// ============================================

/**
 * Set playback speed for all animations
 */
export function setPlaybackSpeed(speed: number): void {
  playbackSpeed = speed;
  syncToTimeline();
  setTimelinePlaybackSpeed(speed);
}

/**
 * Pause all animations
 */
export function pauseAllAnimations(): void {
  pauseAllTimelineAnimations();
  isPaused = true;
  syncToUI();
  updatePanel();
}

/**
 * Play all animations
 */
export function playAllAnimations(): void {
  playAllTimelineAnimations();
  isPaused = false;
  syncToUI();
  updatePanel();
}

/**
 * Toggle highlight mode
 */
export function toggleHighlightMode(): boolean {
  highlightEnabled = toggleHighlight();
  syncToUI();
  updatePanel();
  return highlightEnabled;
}

// ============================================
// Key handlers
// ============================================

/**
 * Handle key down
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isActive) {
    disable();
  }
}

// ============================================
// Public API
// ============================================

/**
 * Enable Animation Inspector
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  // Initialize modules
  initTimeline(
    animations,
    isPaused,
    playbackSpeed,
    highlightEnabled,
    selectedAnimationId,
    timelineCallbacks
  );
  initUI(animations, isPaused, playbackSpeed, highlightEnabled, selectedAnimationId, uiCallbacks);

  // Detect animations
  animations = detectAllAnimations();

  // Re-initialize with detected animations
  syncToTimeline();
  syncToUI();

  // Create panel
  let panel = getPanel();
  if (!panel) {
    panel = createUIPanel();
    setPanel(panel);
  }

  // Build and show panel
  updatePanel();
  panel.style.display = 'flex';

  // Start progress updates
  startProgressUpdates((updatedAnimations) => {
    animations = updatedAnimations;
    // Update timeline display if visible
    if (panel && selectedAnimationId) {
      const anim = animations.find((a) => a.id === selectedAnimationId);
      if (anim) {
        updateProgressBar(selectedAnimationId, anim.progress);
      }
    }
  });

  // Add key listener
  document.addEventListener('keydown', handleKeyDown);

  logger.log('[AnimationInspector] Enabled, found', animations.length, 'animations');
}

/**
 * Disable Animation Inspector
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Hide panel
  const panel = getPanel();
  if (panel) {
    panel.style.display = 'none';
  }

  // Remove highlights
  restoreOriginalStates();

  // Reset playback speed
  setPlaybackSpeed(1);

  // Stop progress updates
  stopProgressUpdates();

  // Remove key listener
  document.removeEventListener('keydown', handleKeyDown);

  logger.log('[AnimationInspector] Disabled');
}

/**
 * Toggle Animation Inspector
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
export function getState(): AnimationState {
  return {
    enabled: isActive,
    animations: [...animations],
    selectedAnimationId,
    playbackSpeed,
    highlightEnabled,
    isPaused,
  };
}

/**
 * Refresh animation list
 */
export function refresh(): void {
  animations = detectAllAnimations();
  if (isActive) {
    syncToTimeline();
    syncToUI();
    updatePanel();
  }
}

/**
 * Cleanup and destroy
 */
export function destroy(): void {
  disable();
  const panel = getPanel();
  if (panel) {
    panel.remove();
    setPanel(null);
  }
  clearOriginalStates();
}

// ============================================
// Export singleton API
// ============================================

export const animationInspector = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  destroy,
  setPlaybackSpeed,
  pauseAll: pauseAllAnimations,
  playAll: playAllAnimations,
  toggleHighlight: toggleHighlightMode,
};

export default animationInspector;
