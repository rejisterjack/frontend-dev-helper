/**
 * React Framework Detector
 *
 * Detects React DevTools hook and extracts component tree information.
 * Uses the React DevTools global hook to access fiber tree data.
 */

import type { ComponentNode, FrameworkType } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

interface ReactFiber {
  tag: number;
  key: string | null;
  elementType: unknown;
  type: unknown;
  stateNode: HTMLElement | null;
  child: ReactFiber | null;
  sibling: ReactFiber | null;
  return: ReactFiber | null;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  pendingProps: Record<string, unknown> | null;
}

interface ReactDevToolsHook {
  renderers: Map<number, unknown>;
  supportsFiber: boolean;
  inject: (renderer: unknown) => number;
  onScheduleRoot?: (root: unknown, children: unknown) => void;
  onCommitRoot?: (root: unknown, priority: number) => void;
  onCommitFiberUnmount?: (rendererID: number, fiber: ReactFiber) => void;
  onPostCommitFiberRoot?: (rendererID: number, root: unknown) => void;
}

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook;
  }
}

// Fiber tag constants
const FIBER_TAGS = {
  FunctionComponent: 0,
  ClassComponent: 1,
  IndeterminateComponent: 2,
  HostRoot: 3,
  HostPortal: 4,
  HostComponent: 5,
  HostText: 6,
  Fragment: 7,
  Mode: 8,
  ContextConsumer: 9,
  ContextProvider: 10,
  ForwardRef: 11,
  SimpleMemoComponent: 14,
  LazyComponent: 16,
  MemoComponent: 15,
};

// ============================================
// Detection
// ============================================

/**
 * Check if React is detected on the page
 */
export function isReactDetected(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined ||
      document.querySelector('[data-reactroot]') !== null ||
      document.querySelector('[data-reactid]') !== null ||
      document.querySelector('[data-react-checksum]') !== null)
  );
}

/**
 * Get React version if available
 */
export function getReactVersion(): string | null {
  // Try to find React version from various sources
  const reactElement = document.querySelector('[data-reactroot], [data-reactid]');
  if (reactElement) {
    // React is present but version might not be directly accessible
    return 'detected';
  }

  // Check for React DevTools hook
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    return 'devtools';
  }

  return null;
}

// ============================================
// Tree Extraction
// ============================================

/**
 * Extract component tree from React fiber tree
 */
export function extractComponentTree(): ComponentNode | null {
  try {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook) {
      // Fallback: try to find React root elements
      return extractTreeFromDOM();
    }

    // Find React root containers
    const reactRoots = findReactRoots();
    if (reactRoots.length === 0) {
      logger.warn('[ReactDetector] No React roots found');
      return null;
    }

    // Build tree from the first root
    const rootFiber = getFiberFromElement(reactRoots[0]);
    if (!rootFiber) {
      return extractTreeFromDOM();
    }

    return buildComponentTree(rootFiber, 0);
  } catch (error) {
    logger.error('[ReactDetector] Failed to extract component tree:', error);
    return extractTreeFromDOM();
  }
}

/**
 * Find React root elements in the DOM
 */
function findReactRoots(): HTMLElement[] {
  const roots: HTMLElement[] = [];

  // Look for elements with React internal properties
  const allElements = document.querySelectorAll('*');
  for (const el of Array.from(allElements)) {
    // Check for React internal property
    const keys = Object.keys(el);
    for (const key of keys) {
      if (key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')) {
        roots.push(el as HTMLElement);
        break;
      }
    }
  }

  // Fallback: look for data attributes
  if (roots.length === 0) {
    const reactRoot = document.querySelector('[data-reactroot]');
    if (reactRoot) {
      roots.push(reactRoot as HTMLElement);
    }
  }

  return roots;
}

/**
 * Get fiber from DOM element
 */
function getFiberFromElement(element: HTMLElement): ReactFiber | null {
  const keys = Object.keys(element);
  for (const key of keys) {
    if (key.startsWith('__reactContainer$') || key.startsWith('__reactFiber$')) {
      return (element as unknown as Record<string, ReactFiber>)[key];
    }
  }
  return null;
}

/**
 * Build component tree from fiber
 */
function buildComponentTree(fiber: ReactFiber | null, depth: number): ComponentNode | null {
  if (!fiber) return null;

  // Skip certain fiber types
  if (shouldSkipFiber(fiber)) {
    // Try to process children instead
    if (fiber.child) {
      return buildComponentTree(fiber.child, depth);
    }
    return null;
  }

  const node = createComponentNode(fiber, depth);

  // Process children
  let child = fiber.child;
  while (child) {
    const childNode = buildComponentTree(child, depth + 1);
    if (childNode) {
      node.children.push(childNode);
    }
    child = child.sibling;
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Check if fiber should be skipped
 */
function shouldSkipFiber(fiber: ReactFiber): boolean {
  const skipTags = [
    FIBER_TAGS.HostRoot,
    FIBER_TAGS.HostPortal,
    FIBER_TAGS.HostText,
    FIBER_TAGS.Mode,
    FIBER_TAGS.ContextConsumer,
    FIBER_TAGS.ContextProvider,
  ];
  return skipTags.includes(fiber.tag);
}

/**
 * Create a component node from fiber
 */
function createComponentNode(fiber: ReactFiber, depth: number): ComponentNode {
  const name = getComponentName(fiber);
  const type = getNodeType(fiber);
  const props = extractProps(fiber.memoizedProps);
  const state = extractState(fiber.memoizedState);

  return {
    id: generateNodeId(fiber, depth),
    name,
    type,
    framework: 'react' as FrameworkType,
    props: Object.keys(props).length > 0 ? props : undefined,
    state: Object.keys(state).length > 0 ? state : undefined,
    children: [],
    depth,
    domElement: fiber.stateNode as HTMLElement | undefined,
    isExpanded: depth < 2,
    hasChildren: false,
  };
}

/**
 * Get component name from fiber
 */
function getComponentName(fiber: ReactFiber): string {
  if (fiber.type) {
    if (typeof fiber.type === 'string') {
      return fiber.type;
    }
    if (typeof fiber.type === 'function') {
      const fn = fiber.type as { name?: string; displayName?: string };
      return fn.displayName || fn.name || 'Anonymous';
    }
    if (typeof fiber.type === 'object' && fiber.type !== null) {
      const typeObj = fiber.type as { displayName?: string; name?: string };
      return typeObj.displayName || typeObj.name || 'Unknown';
    }
  }
  return 'Unknown';
}

/**
 * Get node type from fiber
 */
function getNodeType(fiber: ReactFiber): ComponentNode['type'] {
  switch (fiber.tag) {
    case FIBER_TAGS.FunctionComponent:
    case FIBER_TAGS.ClassComponent:
    case FIBER_TAGS.SimpleMemoComponent:
    case FIBER_TAGS.MemoComponent:
      return 'component';
    case FIBER_TAGS.HostComponent:
      return 'element';
    case FIBER_TAGS.HostText:
      return 'text';
    case FIBER_TAGS.Fragment:
      return 'fragment';
    default:
      return 'element';
  }
}

/**
 * Extract props from fiber
 */
function extractProps(props: Record<string, unknown> | null): Record<string, unknown> {
  if (!props) return {};

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    // Skip internal React props
    if (key === 'children' || key.startsWith('__')) continue;

    // Handle different value types
    if (typeof value === 'function') {
      result[key] = '[Function]';
    } else if (typeof value === 'object' && value !== null) {
      if (React.isValidElement?.(value)) {
        result[key] = '[Element]';
      } else {
        try {
          const stringified = JSON.stringify(value);
          result[key] = stringified.length > 50 ? '[Object]' : value;
        } catch {
          result[key] = '[Object]';
        }
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Extract state from fiber
 */
function extractState(state: unknown): Record<string, unknown> {
  if (!state) return {};

  // Handle different state formats
  if (typeof state === 'object') {
    if (Array.isArray(state)) {
      // React hooks state (array of hook states)
      return extractHooksState(state);
    }
    // Class component state
    return state as Record<string, unknown>;
  }

  return {};
}

/**
 * Extract state from hooks array
 */
function extractHooksState(hooks: unknown[]): Record<string, unknown> {
  const state: Record<string, unknown> = {};

  // This is a simplified extraction
  // Real hook state extraction would require more complex parsing
  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i];
    if (hook && typeof hook === 'object' && 'memoizedState' in hook) {
      const memoizedState = (hook as { memoizedState: unknown }).memoizedState;
      if (memoizedState !== undefined && memoizedState !== null) {
        state[`hook_${i}`] = formatHookValue(memoizedState);
      }
    }
  }

  return state;
}

/**
 * Format hook value for display
 */
function formatHookValue(value: unknown): unknown {
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'object' && value !== null) {
    try {
      const stringified = JSON.stringify(value);
      return stringified.length > 100 ? '[Object]' : value;
    } catch {
      return '[Object]';
    }
  }
  return value;
}

/**
 * Generate unique node ID
 */
function generateNodeId(fiber: ReactFiber, depth: number): string {
  const name = getComponentName(fiber);
  const key = fiber.key || '';
  return `react-${name}-${key}-${depth}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Fallback DOM Extraction
// ============================================

/**
 * Extract tree from DOM as fallback
 */
function extractTreeFromDOM(): ComponentNode | null {
  const body = document.body;
  if (!body) return null;

  return {
    id: 'react-root',
    name: 'React App (DOM Fallback)',
    type: 'component',
    framework: 'react',
    children: Array.from(body.children).map((child, index) =>
      domElementToNode(child as HTMLElement, 1, index)
    ),
    depth: 0,
    isExpanded: true,
    hasChildren: body.children.length > 0,
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
    framework: 'react',
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

    element.style.outline = '2px solid #61dafb';
    element.style.boxShadow = '0 0 0 4px rgba(97, 218, 251, 0.3)';

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
    }, 3000);
  }
}

// ============================================
// React namespace stub for type checking
// ============================================

declare namespace React {
  function isValidElement(value: unknown): boolean;
}
