/**
 * Svelte Framework Detector
 *
 * Detects Svelte applications and extracts component tree information.
 * Supports Svelte 3 and Svelte 4.
 */

import type { ComponentNode, FrameworkType } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

interface SvelteComponent {
  $$?: {
    ctx?: unknown[];
    props?: Record<string, number>;
    callbacks?: Record<string, unknown>;
    fragment?: unknown;
    on_mount?: unknown[];
    on_destroy?: unknown[];
    on_disconnect?: unknown[];
    before_update?: unknown[];
    after_update?: unknown[];
    context?: Map<unknown, unknown>;
    dirty?: number[];
    skip_bound?: boolean;
  };
  $capture_state?: () => Record<string, unknown>;
  $set?: (props: Record<string, unknown>) => void;
  $on?: (type: string, callback: (...args: unknown[]) => void) => () => void;
  $destroy?: () => void;
  constructor?: {
    name?: string;
  };
  [key: string]: unknown;
}

interface SvelteElement extends HTMLElement {
  __svelte_meta?: {
    loc?: {
      file?: string;
      line?: number;
      column?: number;
    };
  };
}

declare global {
  interface Window {
    __SVELTE__?: boolean;
    __svelte?: {
      v: number;
      apps?: Map<HTMLElement, SvelteComponent>;
    };
  }
}

// ============================================
// Detection
// ============================================

/**
 * Check if Svelte is detected on the page
 */
export function isSvelteDetected(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.__SVELTE__ === true ||
      window.__svelte !== undefined ||
      document.querySelector('[class*="svelte-"]') !== null ||
      hasSvelteElements())
  );
}

/**
 * Check if any elements have Svelte internal properties
 */
function hasSvelteElements(): boolean {
  // Look for elements with __svelte_meta
  const elements = document.querySelectorAll('*');
  for (const el of Array.from(elements).slice(0, 100)) {
    if ((el as SvelteElement).__svelte_meta) {
      return true;
    }
    // Check for $$ property on element
    const keys = Object.keys(el);
    for (const key of keys) {
      if (key.startsWith('__svelte') || key === '__svelte_meta') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get Svelte version if available
 */
export function getSvelteVersion(): string | null {
  if (window.__svelte?.v) {
    return `${window.__svelte.v}.x`;
  }

  if (window.__SVELTE__) {
    return 'detected';
  }

  return null;
}

// ============================================
// Tree Extraction
// ============================================

/**
 * Extract component tree from Svelte application
 */
export function extractComponentTree(): ComponentNode | null {
  try {
    // Try to find Svelte components from the DOM
    const svelteRoots = findSvelteRoots();
    if (svelteRoots.length === 0) {
      logger.warn('[SvelteDetector] No Svelte roots found');
      return extractTreeFromDOM();
    }

    // Build tree from the first root
    const rootComponent = svelteRoots[0];
    return buildSvelteComponentTree(rootComponent, 0);
  } catch (error) {
    logger.error('[SvelteDetector] Failed to extract component tree:', error);
    return extractTreeFromDOM();
  }
}

/**
 * Find Svelte root components
 */
function findSvelteRoots(): SvelteComponent[] {
  const roots: SvelteComponent[] = [];

  // Check for __svelte.apps
  if (window.__svelte?.apps) {
    for (const component of window.__svelte.apps.values()) {
      roots.push(component);
    }
    if (roots.length > 0) return roots;
  }

  // Search DOM for Svelte components
  const elements = document.querySelectorAll('*');
  for (const el of Array.from(elements)) {
    // Check for Svelte internal properties
    const svelteKeys = Object.keys(el).filter(
      (key) => key.startsWith('__svelte') || key === '$$'
    );

    for (const key of svelteKeys) {
      const value = (el as unknown as Record<string, SvelteComponent>)[key];
      if (value && typeof value === 'object' && ('$$' in value || '$set' in value)) {
        roots.push(value);
      }
    }
  }

  return roots;
}

/**
 * Build component tree from Svelte component
 */
function buildSvelteComponentTree(component: SvelteComponent, depth: number): ComponentNode {
  const name = getComponentName(component);
  const props = extractProps(component);
  const state = extractState(component);

  const node: ComponentNode = {
    id: `svelte-${name}-${depth}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: 'component',
    framework: 'svelte' as FrameworkType,
    props,
    state,
    children: [],
    depth,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Try to find child Svelte components
  if (depth < 10) {
    const childComponents = findChildComponents(component);
    for (let i = 0; i < childComponents.length; i++) {
      const childNode = buildSvelteComponentTree(childComponents[i], depth + 1);
      node.children.push(childNode);
    }
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Get component name
 */
function getComponentName(component: SvelteComponent): string {
  // Try to get from constructor
  if (component.constructor?.name && component.constructor.name !== 'Object') {
    return component.constructor.name;
  }

  // Try to get from __svelte_meta
  const meta = (component as unknown as SvelteElement).__svelte_meta;
  if (meta?.loc?.file) {
    const fileName = meta.loc.file.split('/').pop();
    if (fileName) {
      return fileName.replace(/\.svelte$/, '');
    }
  }

  return 'SvelteComponent';
}

/**
 * Extract props from component
 */
function extractProps(component: SvelteComponent): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  const $$ = component.$$;
  if ($$?.props) {
    // props is a map of prop name to ctx index
    const ctx = $$.ctx || [];
    for (const [propName, ctxIndex] of Object.entries($$.props)) {
      if (typeof ctxIndex === 'number' && ctxIndex < ctx.length) {
        props[propName] = formatValue(ctx[ctxIndex]);
      }
    }
  }

  // Also try to find props on the component directly
  for (const key of Object.keys(component)) {
    if (
      !key.startsWith('$$') &&
      !key.startsWith('$') &&
      key !== 'constructor' &&
      typeof component[key] !== 'function'
    ) {
      props[key] = formatValue(component[key]);
    }
  }

  return props;
}

/**
 * Extract state from component
 */
function extractState(component: SvelteComponent): Record<string, unknown> {
  const state: Record<string, unknown> = {};

  // Try $capture_state if available (Svelte 4+ with dev mode)
  if (component.$capture_state) {
    try {
      const captured = component.$capture_state();
      for (const [key, value] of Object.entries(captured)) {
        state[key] = formatValue(value);
      }
      return state;
    } catch {
      // Fallback to ctx extraction
    }
  }

  // Extract from ctx
  const $$ = component.$$;
  if ($$?.ctx) {
    // In dev mode, ctx might have named exports
    for (let i = 0; i < $$.ctx.length; i++) {
      const value = $$.ctx[i];
      state[`var_${i}`] = formatValue(value);
    }
  }

  return state;
}

/**
 * Find child Svelte components
 */
function findChildComponents(component: SvelteComponent): SvelteComponent[] {
  const children: SvelteComponent[] = [];

  // Search DOM for elements with Svelte component references
  const componentElement = findComponentElement(component);
  if (!componentElement) return children;

  // Look for nested Svelte components
  const childElements = componentElement.querySelectorAll('*');
  const seen = new Set<unknown>();

  for (const el of Array.from(childElements)) {
    const keys = Object.keys(el).filter(
      (key) => key.startsWith('__svelte') || key === '$$'
    );

    for (const key of keys) {
      const value = (el as unknown as Record<string, SvelteComponent>)[key];
      if (
        value &&
        typeof value === 'object' &&
        ('$$' in value || '$set' in value) &&
        value !== component &&
        !seen.has(value)
      ) {
        children.push(value);
        seen.add(value);
      }
    }
  }

  return children;
}

/**
 * Find DOM element associated with component
 */
function findComponentElement(component: SvelteComponent): HTMLElement | null {
  // Search all elements for this component reference
  const elements = document.querySelectorAll('*');
  for (const el of Array.from(elements)) {
    const keys = Object.keys(el).filter(
      (key) => key.startsWith('__svelte') || key === '$$'
    );

    for (const key of keys) {
      if ((el as unknown as Record<string, SvelteComponent>)[key] === component) {
        return el as HTMLElement;
      }
    }
  }
  return null;
}

// ============================================
// Utilities
// ============================================

/**
 * Format value for display
 */
function formatValue(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();

  if (typeof value === 'object') {
    // Check for Svelte stores
    if (isSvelteStore(value)) {
      return '[Store]';
    }

    if (Array.isArray(value)) {
      if (value.length > 5) {
        return [...value.slice(0, 5), `...(${value.length - 5} more)`];
      }
      return value.map(formatValue);
    }

    try {
      const keys = Object.keys(value);
      if (keys.length > 10) {
        const truncated: Record<string, unknown> = {};
        for (const key of keys.slice(0, 10)) {
          truncated[key] = formatValue((value as Record<string, unknown>)[key]);
        }
        truncated['...'] = `(${keys.length - 10} more keys)`;
        return truncated;
      }

      const formatted: Record<string, unknown> = {};
      for (const key of keys) {
        if (!key.startsWith('$$')) {
          formatted[key] = formatValue((value as Record<string, unknown>)[key]);
        }
      }
      return formatted;
    } catch {
      return '[Object]';
    }
  }

  return value;
}

/**
 * Check if value is a Svelte store
 */
function isSvelteStore(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('subscribe' in value ||
      ('set' in value && 'update' in value))
  );
}

// ============================================
// Fallback DOM Extraction
// ============================================

/**
 * Extract tree from DOM as fallback
 */
function extractTreeFromDOM(): ComponentNode | null {
  // Find elements with svelte- class
  const svelteElement = document.querySelector('[class*="svelte-"]');
  const rootElement = svelteElement || document.body;

  if (!rootElement) return null;

  // Find the root container
  let container = rootElement;
  while (container.parentElement && container !== document.body) {
    const hasSvelteClass = container.parentElement.className.includes('svelte-');
    if (!hasSvelteClass) break;
    container = container.parentElement;
  }

  return {
    id: 'svelte-root',
    name: 'Svelte App',
    type: 'component',
    framework: 'svelte',
    children: Array.from(container.children).map((child, index) =>
      domElementToNode(child as HTMLElement, 1, index)
    ),
    depth: 0,
    isExpanded: true,
    hasChildren: container.children.length > 0,
  };
}

/**
 * Convert DOM element to component node
 */
function domElementToNode(element: HTMLElement, depth: number, index: number): ComponentNode {
  const children: ComponentNode[] = [];
  const isSvelteComponent = element.className.includes('svelte-');

  if (depth < 5) {
    for (let i = 0; i < element.children.length; i++) {
      children.push(domElementToNode(element.children[i] as HTMLElement, depth + 1, i));
    }
  }

  // Extract Svelte component name from class
  let name = element.tagName.toLowerCase();
  if (isSvelteComponent) {
    const svelteClass = Array.from(element.classList).find((c) => c.startsWith('svelte-'));
    if (svelteClass) {
      name = `${name} (${svelteClass})`;
    }
  }

  return {
    id: `dom-${element.tagName}-${depth}-${index}`,
    name,
    type: isSvelteComponent ? 'component' : 'element',
    framework: 'svelte',
    props: extractDOMProps(element),
    children,
    depth,
    domElement: element,
    isExpanded: depth < 2,
    hasChildren: children.length > 0,
  };
}

/**
 * Extract props from DOM element
 */
function extractDOMProps(element: HTMLElement): Record<string, string> {
  const props: Record<string, string> = {};
  const attrs = ['id', 'class', 'data-testid', 'aria-label', 'role'];

  for (const attr of attrs) {
    const value = element.getAttribute(attr);
    if (value) {
      props[attr] = value;
    }
  }

  return props;
}

// ============================================
// Component Highlighting
// ============================================

/**
 * Highlight a component in the DOM
 */
export function highlightComponent(node: ComponentNode): void {
  if (node.domElement) {
    const element = node.domElement;
    const originalOutline = element.style.outline;
    const originalBoxShadow = element.style.boxShadow;

    element.style.outline = '2px solid #ff3e00';
    element.style.boxShadow = '0 0 0 4px rgba(255, 62, 0, 0.3)';

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
    }, 3000);
  }
}
