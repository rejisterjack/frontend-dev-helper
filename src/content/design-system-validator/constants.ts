/**
 * Design System Validator Constants
 * State and configuration constants
 */

import type { ValidatorState } from './types';

export const state: ValidatorState = {
  enabled: false,
  highlightingEnabled: true,
  currentPreset: 'tailwind',
  customTokens: null,
  violations: [],
  report: null,
};

export let shadowHost: HTMLElement | null = null;
export let shadowRoot: ShadowRoot | null = null;
export let panelElement: HTMLElement | null = null;

export function setShadowHost(host: HTMLElement | null): void {
  shadowHost = host;
}

export function setShadowRoot(root: ShadowRoot | null): void {
  shadowRoot = root;
}

export function setPanelElement(panel: HTMLElement | null): void {
  panelElement = panel;
}

export function getShadowHost(): HTMLElement | null {
  return shadowHost;
}

export function getShadowRoot(): ShadowRoot | null {
  return shadowRoot;
}

export function getPanelElement(): HTMLElement | null {
  return panelElement;
}
