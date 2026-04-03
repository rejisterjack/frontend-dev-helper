/**
 * Vue Framework Detector
 *
 * Detects Vue DevTools and extracts component tree information.
 * Supports both Vue 2 and Vue 3.
 */

import type { ComponentNode, FrameworkType } from '@/types';
import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

interface VueInstance {
  $options?: {
    name?: string;
    _componentTag?: string;
    __file?: string;
    props?: Record<string, unknown>;
    data?: () => Record<string, unknown>;
    computed?: Record<string, unknown>;
  };
  $props?: Record<string, unknown>;
  $data?: Record<string, unknown>;
  $children?: VueInstance[];
  $el?: HTMLElement;
  _uid?: number;
  __VUE__?: boolean;
}

interface VueApp {
  config?: {
    globalProperties?: Record<string, unknown>;
    devtools?: boolean;
  };
  _component?: {
    name?: string;
  };
  _container?: HTMLElement;
  _instance?: VueComponentInstance;
  mount: (selector: string | HTMLElement) => VueApp;
  unmount: () => void;
}

interface VueComponentInstance {
  type?: {
    name?: string;
    __file?: string;
    props?: Record<string, unknown>;
  };
  props?: Record<string, unknown>;
  setupState?: Record<string, unknown>;
  data?: Record<string, unknown>;
  subTree?: {
    children?: VueComponentInstance[];
  };
  component?: VueComponentInstance;
  components?: VueComponentInstance[];
  children?: VueComponentInstance[];
  el?: HTMLElement;
  uid?: number;
  parent?: VueComponentInstance;
}

declare global {
  interface Window {
    Vue?: VueInstance;
    __VUE__?: boolean;
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
      Vue?: VueInstance;
      apps?: VueApp[];
      emit: (event: string, ...args: unknown[]) => void;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
    };
    __VUE_OPTIONS_API__?: boolean;
    __VUE_PROD_DEVTOOLS__?: boolean;
  }
}

// ============================================
// Detection
// ============================================

/**
 * Check if Vue is detected on the page
 */
export function isVueDetected(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.__VUE__ === true ||
      window.Vue !== undefined ||
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__ !== undefined ||
      document.querySelector('[data-v-app]') !== null)
  );
}

/**
 * Get Vue version if available
 */
export function getVueVersion(): 2 | 3 | null {
  // Check for Vue 3
  if (window.__VUE__ === true) {
    return 3;
  }

  // Check for Vue 2
  if (window.Vue && !window.__VUE__) {
    return 2;
  }

  // Check devtools hook for version info
  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
  if (hook?.Vue) {
    // Vue 2 typically has Vue property on hook
    return 2;
  }
  if (hook?.apps && hook.apps.length > 0) {
    // Vue 3 uses apps array
    return 3;
  }

  return null;
}

// ============================================
// Tree Extraction
// ============================================

/**
 * Extract component tree from Vue instance
 */
export function extractComponentTree(): ComponentNode | null {
  try {
    const version = getVueVersion();

    if (version === 3) {
      return extractVue3Tree();
    } else if (version === 2) {
      return extractVue2Tree();
    }

    // Fallback: try to detect from DOM
    return extractTreeFromDOM();
  } catch (error) {
    logger.error('[VueDetector] Failed to extract component tree:', error);
    return extractTreeFromDOM();
  }
}

/**
 * Extract tree from Vue 3
 */
function extractVue3Tree(): ComponentNode | null {
  const hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook?.apps?.length) {
    // Try to find Vue 3 app from DOM
    return extractVue3TreeFromDOM();
  }

  const app = hook.apps[0];
  const rootInstance = app._instance;

  if (!rootInstance) {
    return null;
  }

  return buildVue3ComponentTree(rootInstance, 0);
}

/**
 * Extract Vue 3 tree from DOM
 */
function extractVue3TreeFromDOM(): ComponentNode | null {
  // Look for elements with Vue 3 markers
  const appElement = document.querySelector('[data-v-app]');
  if (!appElement) {
    return null;
  }

  // Try to find Vue instance from element
  const vueInstance = findVueInstanceFromElement(appElement as HTMLElement);
  if (vueInstance) {
    return buildVue3ComponentTree(vueInstance, 0);
  }

  return extractTreeFromDOM();
}

/**
 * Find Vue instance from DOM element
 */
function findVueInstanceFromElement(element: HTMLElement): VueComponentInstance | null {
  // Vue 3 stores instance in __vue_app__ or similar property
  const keys = Object.keys(element);
  for (const key of keys) {
    if (key.startsWith('__vue')) {
      const app = (element as unknown as Record<string, { _instance?: VueComponentInstance }>)[key];
      if (app && typeof app === 'object' && '_instance' in app) {
        return app._instance ?? null;
      }
    }
  }

  // Check children
  for (const child of Array.from(element.children)) {
    const instance = findVueInstanceFromElement(child as HTMLElement);
    if (instance) return instance;
  }

  return null;
}

/**
 * Build component tree from Vue 3 instance
 */
function buildVue3ComponentTree(instance: VueComponentInstance, depth: number): ComponentNode {
  const name = getVue3ComponentName(instance);
  const props = instance.props || {};
  const state = {
    ...((instance.setupState as Record<string, unknown>) || {}),
    ...(instance.data || {}),
  };

  const node: ComponentNode = {
    id: `vue3-${name}-${instance.uid || depth}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: 'component',
    framework: 'vue' as FrameworkType,
    props: sanitizeProps(props),
    state: sanitizeState(state),
    children: [],
    depth,
    domElement: instance.el as HTMLElement | undefined,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Process children
  const children = extractVue3Children(instance);
  for (const child of children) {
    const childNode = buildVue3ComponentTree(child, depth + 1);
    node.children.push(childNode);
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Extract children from Vue 3 instance
 */
function extractVue3Children(instance: VueComponentInstance): VueComponentInstance[] {
  const children: VueComponentInstance[] = [];

  // Check subTree children
  if (instance.subTree?.children) {
    const subTreeChildren = Array.isArray(instance.subTree.children)
      ? instance.subTree.children
      : [instance.subTree.children];

    for (const child of subTreeChildren) {
      if (child.component) {
        children.push(child.component);
      }
      // Recursively extract from child
      if (child.children) {
        const nested = extractVue3Children(child);
        children.push(...nested);
      }
    }
  }

  // Check components array
  if (instance.components) {
    children.push(...instance.components);
  }

  return children;
}

/**
 * Get component name from Vue 3 instance
 */
function getVue3ComponentName(instance: VueComponentInstance): string {
  if (instance.type?.name) {
    return instance.type.name;
  }
  if (instance.type?.__file) {
    const fileName = instance.type.__file.split('/').pop();
    if (fileName) {
      return fileName.replace(/\.vue$/, '');
    }
  }
  return `Component${instance.uid || ''}`;
}

/**
 * Extract tree from Vue 2
 */
function extractVue2Tree(): ComponentNode | null {
  // Try to find Vue root instance
  const vueGlobal = window.Vue;
  if (!vueGlobal) {
    return extractTreeFromDOM();
  }

  let found: ComponentNode | null = null;
  walkElementsEfficiently(
    document,
    (el) => {
      if (found) return;
      const htmlEl = el as HTMLElement & { __vue__?: VueInstance };
      if (htmlEl.__vue__) {
        found = buildVue2ComponentTree(htmlEl.__vue__, 0);
      }
    },
    (msg) => logger.log(msg)
  );
  if (found) {
    return found;
  }

  return extractTreeFromDOM();
}

/**
 * Build component tree from Vue 2 instance
 */
function buildVue2ComponentTree(instance: VueInstance, depth: number): ComponentNode {
  const name = getVue2ComponentName(instance);
  const props = instance.$props || {};
  const data = instance.$data || {};

  const node: ComponentNode = {
    id: `vue2-${name}-${instance._uid || depth}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: 'component',
    framework: 'vue' as FrameworkType,
    props: sanitizeProps(props),
    state: sanitizeState(data),
    children: [],
    depth,
    domElement: instance.$el,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Process children
  if (instance.$children) {
    for (const child of instance.$children) {
      const childNode = buildVue2ComponentTree(child, depth + 1);
      node.children.push(childNode);
    }
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Get component name from Vue 2 instance
 */
function getVue2ComponentName(instance: VueInstance): string {
  if (instance.$options?.name) {
    return instance.$options.name;
  }
  if (instance.$options?._componentTag) {
    return instance.$options._componentTag;
  }
  if (instance.$options?.__file) {
    const fileName = instance.$options.__file.split('/').pop();
    if (fileName) {
      return fileName.replace(/\.vue$/, '');
    }
  }
  return `Component${instance._uid || ''}`;
}

// ============================================
// Utilities
// ============================================

/**
 * Sanitize props for display
 */
function sanitizeProps(props: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('_') || key.startsWith('$')) continue;

    result[key] = formatValue(value);
  }

  return result;
}

/**
 * Sanitize state for display
 */
function sanitizeState(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith('_') || key.startsWith('$')) continue;

    result[key] = formatValue(value);
  }

  return result;
}

/**
 * Format value for display
 */
function formatValue(value: unknown): unknown {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();

  if (typeof value === 'object') {
    // Check if it's a Vue reactive object
    if ('__v_isRef' in value && (value as { __v_isRef?: boolean }).__v_isRef) {
      return formatValue((value as unknown as { value: unknown }).value);
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
        formatted[key] = formatValue((value as Record<string, unknown>)[key]);
      }
      return formatted;
    } catch {
      return '[Object]';
    }
  }

  return value;
}

// ============================================
// Fallback DOM Extraction
// ============================================

/**
 * Extract tree from DOM as fallback
 */
function extractTreeFromDOM(): ComponentNode | null {
  const appElement = document.querySelector('[data-v-app]') || document.body;
  if (!appElement) return null;

  return {
    id: 'vue-root',
    name: 'Vue App (DOM Fallback)',
    type: 'component',
    framework: 'vue',
    children: Array.from(appElement.children).map((child, index) =>
      domElementToNode(child as HTMLElement, 1, index)
    ),
    depth: 0,
    isExpanded: true,
    hasChildren: appElement.children.length > 0,
  };
}

/**
 * Convert DOM element to component node
 */
function domElementToNode(element: HTMLElement, depth: number, index: number): ComponentNode {
  const children: ComponentNode[] = [];

  if (depth < 5) {
    for (let i = 0; i < element.children.length; i++) {
      children.push(domElementToNode(element.children[i] as HTMLElement, depth + 1, i));
    }
  }

  return {
    id: `dom-${element.tagName}-${depth}-${index}`,
    name: element.tagName.toLowerCase(),
    type: 'element',
    framework: 'vue',
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

    element.style.outline = '2px solid #42b883';
    element.style.boxShadow = '0 0 0 4px rgba(66, 184, 131, 0.3)';

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
    }, 3000);
  }
}
