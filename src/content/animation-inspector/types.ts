/**
 * Animation Inspector Types
 *
 * Type definitions for the animation inspector module.
 */

/** Animation type */
export type AnimationType = 'css-animation' | 'css-transition' | 'web-animation';

/** Animation information */
export interface AnimationInfo {
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
export interface AnimationState {
  enabled: boolean;
  animations: AnimationInfo[];
  selectedAnimationId: string | null;
  playbackSpeed: number;
  highlightEnabled: boolean;
  isPaused: boolean;
}

/** Panel position */
export interface PanelPosition {
  x: number;
  y: number;
}
