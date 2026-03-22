/**
 * Animation Detector
 *
 * Animation detection logic for CSS animations and transitions.
 */

import { logger } from '@/utils/logger';
import type { AnimationInfo } from './types';

/**
 * Generate unique ID for animation
 */
export function generateId(): string {
  return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse CSS timing function to human-readable format
 */
export function parseEasing(easing: string): string {
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
export function parseTime(time: string): number {
  if (!time) return 0;
  if (time === 'infinite') return Infinity;

  const match = time.match(/^(\d[\d.]*)m?s$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2];

  return unit === 's' ? value * 1000 : value;
}

/**
 * Get all elements with animations
 */
export function getAnimatedElements(): HTMLElement[] {
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
export function extractKeyframes(animationName: string): CSSKeyframeRule[] | undefined {
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
export function detectCSSAnimations(element: HTMLElement): AnimationInfo[] {
  const style = window.getComputedStyle(element);
  const results: AnimationInfo[] = [];

  if (!style.animationName || style.animationName === 'none') {
    return results;
  }

  const names = style.animationName.split(',').map((n) => n.trim());
  const durations = style.animationDuration.split(',').map((d) => d.trim());
  const delays = style.animationDelay.split(',').map((d) => d.trim());
  const timingFunctions = style.animationTimingFunction.split(',').map((t) => t.trim());
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
export function detectCSSTransitions(element: HTMLElement): AnimationInfo[] {
  const style = window.getComputedStyle(element);
  const results: AnimationInfo[] = [];

  if (style.transitionProperty === 'all' && style.transitionDuration === '0s') {
    return results;
  }

  const properties = style.transitionProperty.split(',').map((p) => p.trim());
  const durations = style.transitionDuration.split(',').map((d) => d.trim());
  const delays = style.transitionDelay.split(',').map((d) => d.trim());
  const timingFunctions = style.transitionTimingFunction.split(',').map((t) => t.trim());

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
export function detectAllAnimations(): AnimationInfo[] {
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

  logger.log('[AnimationInspector] Detected', results.length, 'animations');
  return results;
}
