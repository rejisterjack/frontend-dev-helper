import { logger } from '../utils/logger';

/**
 * Animation Inspector
 *
 * Detects, visualizes, and controls CSS animations and transitions on the page.
 * Features: timeline view, play/pause controls, speed adjustment, element highlighting.
 */

// ============================================
// Types & Interfaces
// ============================================

/** Animation type */
type AnimationType = 'css-animation' | 'css-transition' | 'web-animation';

/** Animation information */
interface AnimationInfo {
  id: string;
  element: HTMLElement;
  type: AnimationType;
  name: string;
  duration: number;
  delay: number;
  easing: string;
  iterationCount: number | string;
  direction: string;
  fillMode: string;
  playState: string;
  progress: number;
  keyframes?: Keyframe[];
  cssRule?: CSSKeyframeRule[];
}

/** Animation state */
interface AnimationState {
  enabled: boolean;
  animations: AnimationInfo[];
  selectedAnimationId: string | null;
  playbackSpeed: number;
  highlightEnabled: boolean;
  isPaused: boolean;
}

/** Panel position */
interface PanelPosition {
  x: number;
  y: number;
}

// ============================================
// State
// ============================================

let isActive = false;
let panel: HTMLElement | null = null;
let animations: AnimationInfo[] = [];
let selectedAnimationId: string | null = null;
let playbackSpeed = 1;
let highlightEnabled = false;
let isPaused = false;
const panelPosition: PanelPosition = { x: 20, y: 20 };
let isDragging = false;
const dragOffset = { x: 0, y: 0 };
let updateInterval: number | null = null;

// Store original animation states
const originalStates = new Map<HTMLElement, Map<string, string>>();

// ============================================
// Constants
// ============================================

const SPEED_OPTIONS = [0.25, 0.5, 1, 2];
const PANEL_WIDTH = 420;
const PANEL_MIN_HEIGHT = 300;
const PANEL_MAX_HEIGHT = 600;

// ============================================
// Animation Detection
// ============================================

/**
 * Generate unique ID for animation
 */
function generateId(): string {
  return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse CSS timing function to human-readable format
 */
function parseEasing(easing: string): string {
  const easingMap: Record<string, string> = {
    linear: 'Linear',
    ease: 'Ease',
    'ease-in': 'Ease In',
    'ease-out': 'Ease Out',
    'ease-in-out': 'Ease In Out',
    'step-start': 'Step Start',
    'step-end': 'Step End',
  };

  if (easingMap[easing]) return easingMap[easing];

  // Parse cubic-bezier
  const cubicMatch = easing.match(/cubic-bezier\(([^)]+)\)/);
  if (cubicMatch) {
    const [x1, y1, x2, y2] = cubicMatch[1].split(',').map((v) => parseFloat(v.trim()));
    return `Cubic Bezier (${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
  }

  // Parse steps
  const stepsMatch = easing.match(/steps\((\d+)(?:,\s*(\w+))?\)/);
  if (stepsMatch) {
    const count = stepsMatch[1];
    const direction = stepsMatch[2] || 'end';
    return `Steps (${count}, ${direction})`;
  }

  return easing;
}

/**
 * Parse time value to milliseconds
 */
function parseTime(time: string): number {
  if (!time) return 0;
  if (time === 'infinite') return Infinity;

  const match = time.match(/^([\d.]+)(m?s)$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2];

  return unit === 's' ? value * 1000 : value;
}

/**
 * Get all elements with animations
 */
function getAnimatedElements(): HTMLElement[] {
  const allElements = Array.from(document.querySelectorAll('*')) as HTMLElement[];
  return allElements.filter((el) => {
    const style = window.getComputedStyle(el);
    const hasAnimation = style.animationName && style.animationName !== 'none';
    const hasTransition =
      style.transitionProperty &&
      style.transitionProperty !== 'all 0s ease 0s' &&
      style.transitionDuration !== '0s';
    return hasAnimation || hasTransition;
  });
}

/**
 * Extract keyframes from CSS rule
 */
function extractKeyframes(animationName: string): CSSKeyframeRule[] | undefined {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule.type === CSSRule.KEYFRAMES_RULE) {
          const keyframesRule = rule as CSSKeyframesRule;
          if (keyframesRule.name === animationName) {
            return Array.from(keyframesRule.cssRules) as CSSKeyframeRule[];
          }
        }
      }
    } catch (_e) {
      // Skip cross-origin stylesheets
    }
  }
  return undefined;
}

/**
 * Detect CSS animations on an element
 */
function detectCSSAnimations(element: HTMLElement): AnimationInfo[] {
  const style = window.getComputedStyle(element);
  const results: AnimationInfo[] = [];

  if (!style.animationName || style.animationName === 'none') {
    return results;
  }

  const names = style.animationName.split(',').map((n) => n.trim());
  const durations = style.animationDuration.split(',').map((d) => d.trim());
  const delays = style.animationDelay.split(',').map((d) => d.trim());
  const timingFunctions = style.animationTimingFunction.split(','.trim());
  const iterationCounts = style.animationIterationCount.split(',').map((i) => i.trim());
  const directions = style.animationDirection.split(',').map((d) => d.trim());
  const fillModes = style.animationFillMode.split(',').map((f) => f.trim());
  const playStates = style.animationPlayState.split(',').map((p) => p.trim());

  names.forEach((name, index) => {
    const duration = parseTime(durations[index] || durations[0] || '0s');
    const delay = parseTime(delays[index] || delays[0] || '0s');

    results.push({
      id: generateId(),
      element,
      type: 'css-animation',
      name,
      duration,
      delay,
      easing: parseEasing(timingFunctions[index] || timingFunctions[0] || 'ease'),
      iterationCount: iterationCounts[index] || iterationCounts[0] || '1',
      direction: directions[index] || directions[0] || 'normal',
      fillMode: fillModes[index] || fillModes[0] || 'none',
      playState: playStates[index] || playStates[0] || 'running',
      progress: 0,
      keyframes: undefined,
      cssRule: extractKeyframes(name),
    });
  });

  return results;
}

/**
 * Detect CSS transitions on an element
 */
function detectCSSTransitions(element: HTMLElement): AnimationInfo[] {
  const style = window.getComputedStyle(element);
  const results: AnimationInfo[] = [];

  if (style.transitionProperty === 'all' && style.transitionDuration === '0s') {
    return results;
  }

  const properties = style.transitionProperty.split(',').map((p) => p.trim());
  const durations = style.transitionDuration.split(',').map((d) => d.trim());
  const delays = style.transitionDelay.split(',').map((d) => d.trim());
  const timingFunctions = style.transitionTimingFunction.split(','.map((t) => t.trim()));

  properties.forEach((prop, index) => {
    if (prop === 'all') return;

    const duration = parseTime(durations[index] || durations[0] || '0s');
    if (duration === 0) return;

    results.push({
      id: generateId(),
      element,
      type: 'css-transition',
      name: prop,
      duration,
      delay: parseTime(delays[index] || delays[0] || '0s'),
      easing: parseEasing(timingFunctions[index] || timingFunctions[0] || 'ease'),
      iterationCount: 1,
      direction: 'normal',
      fillMode: 'both',
      playState: 'running',
      progress: 0,
    });
  });

  return results;
}

/**
 * Detect all animations on the page
 */
function detectAllAnimations(): AnimationInfo[] {
  const results: AnimationInfo[] = [];
  const animatedElements = getAnimatedElements();

  for (const element of animatedElements) {
    // Detect CSS animations
    const cssAnimations = detectCSSAnimations(element);
    results.push(...cssAnimations);

    // Detect CSS transitions
    const transitions = detectCSSTransitions(element);
    results.push(...transitions);
  }

  return results;
}

// ============================================
// Animation Control
// ============================================

/**
 * Pause all animations
 */
function pauseAllAnimations(): void {
  document.body.style.setProperty('--fdh-anim-play-state', 'paused');

  for (const anim of animations) {
    if (anim.type === 'css-animation') {
      anim.element.style.animationPlayState = 'paused';
    }
    (anim.element as HTMLElement).style.setProperty('animation-play-state', 'paused', 'important');
  }

  // Pause Web Animations API animations
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const webAnimations =
      (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
    for (const anim of webAnimations) {
      if (anim.playState === 'running') {
        anim.pause();
      }
    }
  }

  isPaused = true;
  updatePanel();
}

/**
 * Play all animations
 */
function playAllAnimations(): void {
  document.body.style.setProperty('--fdh-anim-play-state', 'running');

  for (const anim of animations) {
    if (anim.type === 'css-animation') {
      anim.element.style.animationPlayState = 'running';
    }
    (anim.element as HTMLElement).style.setProperty('animation-play-state', 'running', 'important');
  }

  // Play Web Animations API animations
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const webAnimations =
      (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
    for (const anim of webAnimations) {
      if (anim.playState === 'paused') {
        anim.play();
      }
    }
  }

  isPaused = false;
  updatePanel();
}

/**
 * Set playback speed for all animations
 */
function setPlaybackSpeed(speed: number): void {
  playbackSpeed = speed;

  // Update CSS animations speed
  document.documentElement.style.setProperty('--fdh-anim-speed', `${1 / speed}`);

  for (const anim of animations) {
    anim.element.style.setProperty('animation-duration', `${anim.duration / speed}ms`, 'important');
    anim.element.style.setProperty(
      'transition-duration',
      `${anim.duration / speed}ms`,
      'important'
    );
  }

  // Update Web Animations API speed
  const allElements = document.querySelectorAll('*');
  for (const el of allElements) {
    const webAnimations =
      (el as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
    for (const anim of webAnimations) {
      anim.playbackRate = speed;
    }
  }

  updatePanel();
}

/**
 * Pause specific animation
 */
function pauseAnimation(animationId: string): void {
  const anim = animations.find((a) => a.id === animationId);
  if (!anim) return;

  if (anim.type === 'css-animation') {
    // Store original state if not already stored
    if (!originalStates.has(anim.element)) {
      originalStates.set(anim.element, new Map());
    }
    const states = originalStates.get(anim.element)!;
    if (!states.has('animationPlayState')) {
      states.set('animationPlayState', anim.element.style.animationPlayState);
    }

    anim.element.style.animationPlayState = 'paused';
  }

  anim.playState = 'paused';
  updatePanel();
}

/**
 * Play specific animation
 */
function playAnimation(animationId: string): void {
  const anim = animations.find((a) => a.id === animationId);
  if (!anim) return;

  if (anim.type === 'css-animation') {
    anim.element.style.animationPlayState = 'running';
  }

  anim.playState = 'running';
  updatePanel();
}

// ============================================
// Element Highlighting
// ============================================

/**
 * Highlight an animated element
 */
function highlightElement(element: HTMLElement, animationId: string): void {
  if (!highlightEnabled) return;

  // Remove previous highlights
  removeHighlights();

  // Add highlight to the element
  element.classList.add('fdh-anim-highlight');
  element.style.setProperty('outline', '3px solid #3b82f6', 'important');
  element.style.setProperty('outline-offset', '2px', 'important');
  element.style.setProperty('position', 'relative', 'important');

  // Scroll element into view if needed
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

  selectedAnimationId = animationId;
  updatePanel();
}

/**
 * Remove all highlights
 */
function removeHighlights(): void {
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
function toggleHighlight(): void {
  highlightEnabled = !highlightEnabled;

  if (!highlightEnabled) {
    removeHighlights();
  } else if (selectedAnimationId) {
    const anim = animations.find((a) => a.id === selectedAnimationId);
    if (anim) {
      highlightElement(anim.element, selectedAnimationId);
    }
  }

  updatePanel();
}

// ============================================
// UI Panel
// ============================================

/**
 * Create the animation inspector panel
 */
function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'fdh-animation-inspector';
  el.className = 'fdh-anim-panel';
  el.style.cssText = `
    position: fixed;
    top: ${panelPosition.y}px;
    right: ${panelPosition.x}px;
    width: ${PANEL_WIDTH}px;
    min-height: ${PANEL_MIN_HEIGHT}px;
    max-height: ${PANEL_MAX_HEIGHT}px;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  `;

  document.body.appendChild(el);
  return el;
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms === Infinity) return '∞';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Format iteration count
 */
function formatIterationCount(count: number | string): string {
  if (count === 'infinite' || count === Infinity) return '∞';
  return String(count);
}

/**
 * Get element selector
 */
function getElementSelector(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('');
  return `${tag}${id}${classes}`;
}

/**
 * Build panel header
 */
function buildHeader(): string {
  return `
    <div class="fdh-anim-header" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      cursor: move;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span style="font-weight: 600; font-size: 14px; color: #f1f5f9;">Animation Inspector</span>
        <span style="
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        ">${animations.length} found</span>
      </div>
      <button class="fdh-anim-close" style="
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      " title="Close (Esc)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

/**
 * Build toolbar
 */
function buildToolbar(): string {
  return `
    <div class="fdh-anim-toolbar" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      gap: 12px;
    ">
      <div style="display: flex; gap: 8px;">
        <button class="fdh-anim-play-pause" style="
          background: ${isPaused ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}};
          border: 1px solid ${isPaused ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}};
          color: ${isPaused ? '#4ade80' : '#f87171'};
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        ">
          ${
            isPaused
              ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play All`
              : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause All`
          }
        </button>
        
        <button class="fdh-anim-highlight-toggle" style="
          background: ${highlightEnabled ? 'rgba(99, 102, 241, 0.3)' : 'rgba(30, 41, 59, 0.8)'};
          border: 1px solid ${highlightEnabled ? 'rgba(99, 102, 241, 0.5)' : 'rgba(99, 102, 241, 0.3)'};
          color: ${highlightEnabled ? '#818cf8' : '#94a3b8'};
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
            <path d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.828-.828M3.995 12.004h1M6.34 6.344l.828.828"/>
          </svg>
          ${highlightEnabled ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="color: #64748b; font-size: 11px;">Speed:</span>
        <div style="display: flex; background: rgba(30, 41, 59, 0.8); border-radius: 6px; padding: 2px;">
          ${SPEED_OPTIONS.map(
            (speed) => `
            <button class="fdh-anim-speed" data-speed="${speed}" style="
              background: ${playbackSpeed === speed ? 'rgba(99, 102, 241, 0.4)' : 'transparent'};
              border: none;
              color: ${playbackSpeed === speed ? '#e2e8f0' : '#64748b'};
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              transition: all 0.2s;
              font-weight: ${playbackSpeed === speed ? '500' : 'normal'};
            ">${speed}x</button>
          `
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Build animation list
 */
function buildAnimationList(): string {
  if (animations.length === 0) {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        color: #64748b;
        text-align: center;
      ">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px; opacity: 0.5;">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <p style="margin: 0; font-size: 13px;">No animations detected</p>
        <p style="margin: 8px 0 0; font-size: 11px; opacity: 0.7;">Try interacting with the page or refreshing</p>
      </div>
    `;
  }

  return `
    <div class="fdh-anim-list" style="
      flex: 1;
      overflow-y: auto;
      max-height: 350px;
    ">
      ${animations
        .map(
          (anim) => `
        <div class="fdh-anim-item" data-id="${anim.id}" style="
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.2s;
          background: ${selectedAnimationId === anim.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent'};
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
              <span style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${anim.type === 'css-animation' ? '#3b82f6' : '#10b981'};
                flex-shrink: 0;
              "></span>
              <span style="
                font-weight: 500;
                color: #f1f5f9;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              ">${anim.name}</span>
              <span style="
                background: rgba(30, 41, 59, 0.8);
                color: #64748b;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 10px;
                text-transform: uppercase;
                flex-shrink: 0;
              ">${anim.type === 'css-animation' ? 'CSS' : 'Trans'}</span>
            </div>
            <button class="fdh-anim-item-play" data-id="${anim.id}" style="
              background: transparent;
              border: none;
              color: ${anim.playState === 'running' ? '#f87171' : '#4ade80'};
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            " title="${anim.playState === 'running' ? 'Pause' : 'Play'}">
              ${
                anim.playState === 'running'
                  ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
                  : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`
              }
            </button>
          </div>
          
          <div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
            <span style="color: #94a3b8; font-size: 11px;">
              <span style="color: #64748b;">Duration:</span> ${formatDuration(anim.duration)}
            </span>
            <span style="color: #94a3b8; font-size: 11px;">
              <span style="color: #64748b;">Delay:</span> ${formatDuration(anim.delay)}
            </span>
            ${
              anim.type === 'css-animation'
                ? `
              <span style="color: #94a3b8; font-size: 11px;">
                <span style="color: #64748b;">Iterations:</span> ${formatIterationCount(anim.iterationCount)}
              </span>
            `
                : ''
            }
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #64748b; font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">
              ${getElementSelector(anim.element)}
            </span>
            <span style="color: #93c5fd; font-size: 10px;">${anim.easing}</span>
          </div>
          
          ${selectedAnimationId === anim.id ? buildAnimationDetails(anim) : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Build animation details view
 */
function buildAnimationDetails(anim: AnimationInfo): string {
  let keyframesHtml = '';

  if (anim.cssRule && anim.cssRule.length > 0) {
    keyframesHtml = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
        <div style="color: #64748b; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Keyframes</div>
        <div style="background: rgba(30, 41, 59, 0.8); border-radius: 6px; padding: 10px; font-size: 10px; max-height: 150px; overflow-y: auto;">
          ${anim.cssRule
            .map(
              (rule) => `
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="color: #c084fc; margin-bottom: 4px; font-weight: 500;">${rule.keyText}</div>
              <div style="color: #94a3b8; line-height: 1.5;">${rule.style.cssText.replace(/; /g, ';<br>')}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top: 12px; padding: 12px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
        <div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 2px;">Direction</div>
          <div style="color: #e2e8f0; font-size: 11px;">${anim.direction}</div>
        </div>
        <div>
          <div style="color: #64748b; font-size: 10px; margin-bottom: 2px;">Fill Mode</div>
          <div style="color: #e2e8f0; font-size: 11px;">${anim.fillMode}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="color: #64748b; font-size: 10px; margin-bottom: 4px;">Timeline</div>
        <div style="background: rgba(15, 23, 42, 0.8); height: 24px; border-radius: 4px; overflow: hidden; position: relative;">
          <div style="
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: ${anim.progress}%;
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.6), rgba(99, 102, 241, 0.8));
            transition: width 0.1s linear;
          "></div>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8;">
            ${Math.round(anim.progress)}%
          </div>
        </div>
      </div>
      
      ${keyframesHtml}
      
      <button class="fdh-anim-scroll-to" data-id="${anim.id}" style="
        width: 100%;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        color: #818cf8;
        padding: 8px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;
      ">Scroll to Element</button>
    </div>
  `;
}

/**
 * Build panel footer
 */
function buildFooter(): string {
  return `
    <div class="fdh-anim-footer" style="
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #64748b;
    ">
      <span>Press <kbd style="background: rgba(30, 41, 59, 0.8); padding: 2px 6px; border-radius: 4px; font-family: inherit;">Esc</kbd> to close</span>
      <button class="fdh-anim-refresh" style="
        background: transparent;
        border: none;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: all 0.2s;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        Refresh
      </button>
    </div>
  `;
}

/**
 * Build complete panel HTML
 */
function buildPanelHTML(): string {
  return `
    ${buildHeader()}
    ${buildToolbar()}
    ${buildAnimationList()}
    ${buildFooter()}
  `;
}

/**
 * Update panel content
 */
function updatePanel(): void {
  if (!panel) return;
  panel.innerHTML = buildPanelHTML();
  setupPanelEventListeners();
}

/**
 * Setup panel event listeners
 */
function setupPanelEventListeners(): void {
  if (!panel) return;

  // Close button
  const closeBtn = panel.querySelector('.fdh-anim-close');
  closeBtn?.addEventListener('click', disable);

  // Play/Pause all button
  const playPauseBtn = panel.querySelector('.fdh-anim-play-pause');
  playPauseBtn?.addEventListener('click', () => {
    if (isPaused) {
      playAllAnimations();
    } else {
      pauseAllAnimations();
    }
  });

  // Highlight toggle
  const highlightBtn = panel.querySelector('.fdh-anim-highlight-toggle');
  highlightBtn?.addEventListener('click', toggleHighlight);

  // Speed buttons
  const speedBtns = panel.querySelectorAll('.fdh-anim-speed');
  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const speed = parseFloat((btn as HTMLElement).dataset.speed || '1');
      setPlaybackSpeed(speed);
    });
  });

  // Animation item click
  const animItems = panel.querySelectorAll('.fdh-anim-item');
  animItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      // Don't select if clicking play button
      if ((e.target as HTMLElement).closest('.fdh-anim-item-play')) return;

      const id = (item as HTMLElement).dataset.id;
      if (id) {
        const anim = animations.find((a) => a.id === id);
        if (anim) {
          selectedAnimationId = id;
          if (highlightEnabled) {
            highlightElement(anim.element, id);
          }
          updatePanel();
        }
      }
    });
  });

  // Individual play/pause buttons
  const itemPlayBtns = panel.querySelectorAll('.fdh-anim-item-play');
  itemPlayBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id;
      if (!id) return;

      const anim = animations.find((a) => a.id === id);
      if (!anim) return;

      if (anim.playState === 'running') {
        pauseAnimation(id);
      } else {
        playAnimation(id);
      }
    });
  });

  // Scroll to element buttons
  const scrollBtns = panel.querySelectorAll('.fdh-anim-scroll-to');
  scrollBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      if (!id) return;

      const anim = animations.find((a) => a.id === id);
      if (anim) {
        anim.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        highlightElement(anim.element, id);
      }
    });
  });

  // Refresh button
  const refreshBtn = panel.querySelector('.fdh-anim-refresh');
  refreshBtn?.addEventListener('click', () => {
    animations = detectAllAnimations();
    updatePanel();
  });

  // Header drag
  const header = panel.querySelector('.fdh-anim-header');
  header?.addEventListener('mousedown', handleDragStart);
}

/**
 * Handle drag start
 */
function handleDragStart(e: MouseEvent): void {
  if (!panel) return;

  const target = e.target as HTMLElement;
  if (target.closest('.fdh-anim-close')) return;

  isDragging = true;
  const rect = panel.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
}

/**
 * Handle drag move
 */
function handleDragMove(e: MouseEvent): void {
  if (!isDragging || !panel) return;

  const x = e.clientX - dragOffset.x;
  const y = e.clientY - dragOffset.y;

  panel.style.left = `${x}px`;
  panel.style.top = `${y}px`;
  panel.style.right = 'auto';

  panelPosition.x = window.innerWidth - (x + PANEL_WIDTH);
  panelPosition.y = y;
}

/**
 * Handle drag end
 */
function handleDragEnd(): void {
  isDragging = false;
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
}

/**
 * Start animation progress updates
 */
function startProgressUpdates(): void {
  if (updateInterval) return;

  updateInterval = window.setInterval(() => {
    if (isPaused) return;

    // Update progress for CSS animations
    for (const anim of animations) {
      if (anim.type === 'css-animation') {
        // Try to get animation progress from Web Animations API
        const webAnims =
          (anim.element as Element & { getAnimations?: () => Animation[] }).getAnimations?.() || [];
        for (const wa of webAnims) {
          if (wa.effect && 'getComputedTiming' in wa.effect) {
            const timing = (
              wa.effect as AnimationEffect & { getComputedTiming: () => { progress?: number } }
            ).getComputedTiming();
            if (timing.progress !== undefined) {
              anim.progress = timing.progress * 100;
            }
          }
        }
      }
    }

    // Update timeline display if visible
    if (panel && selectedAnimationId) {
      const anim = animations.find((a) => a.id === selectedAnimationId);
      if (anim) {
        const progressBar = panel.querySelector(
          `.fdh-anim-item[data-id="${selectedAnimationId}"] [style*="width"]`
        );
        if (progressBar) {
          (progressBar as HTMLElement).style.width = `${anim.progress}%`;
        }
      }
    }
  }, 100);
}

/**
 * Stop animation progress updates
 */
function stopProgressUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
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

  // Detect animations
  animations = detectAllAnimations();

  // Create panel
  if (!panel) {
    panel = createPanel();
  }

  // Build and show panel
  updatePanel();
  panel.style.display = 'flex';

  // Start progress updates
  startProgressUpdates();

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
  if (panel) {
    panel.style.display = 'none';
  }

  // Remove highlights
  removeHighlights();

  // Restore original animation states
  for (const [element, states] of originalStates) {
    const playState = states.get('animationPlayState');
    if (playState) {
      element.style.animationPlayState = playState;
    } else {
      element.style.removeProperty('animation-play-state');
    }
  }
  originalStates.clear();

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
    updatePanel();
  }
}

/**
 * Cleanup and destroy
 */
export function destroy(): void {
  disable();
  if (panel) {
    panel.remove();
    panel = null;
  }
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
  toggleHighlight,
};

export default animationInspector;
