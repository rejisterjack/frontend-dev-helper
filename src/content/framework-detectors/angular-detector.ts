/**
 * Angular Framework Detector
 *
 * Detects Angular DevTools and extracts component tree information.
 * Supports Angular 2+ ( Ivy and View Engine ).
 */

import type { ComponentNode, FrameworkType } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

interface AngularComponentInstance {
  constructor?: {
    name?: string;
    ɵcmp?: AngularComponentDef;
    ɵfac?: unknown;
  };
  __ngContext__?: number | unknown[];
  [key: string]: unknown;
}

interface AngularComponentDef {
  type: { name: string };
  selectors?: string[][];
  inputs?: { [key: string]: string };
  outputs?: { [key: string]: string };
}

interface AngularDebugElement {
  name: string;
  componentInstance: AngularComponentInstance | null;
  nativeElement: HTMLElement;
  children: AngularDebugElement[];
  parent: AngularDebugElement | null;
  properties: { [key: string]: unknown };
  attributes: { [key: string]: string };
  styles: { [key: string]: string };
  classes: { [key: string]: boolean };
  listenerClues: unknown[];
}

declare global {
  interface Window {
    ng?: {
      getComponent: (element: HTMLElement) => AngularComponentInstance | null;
      getOwningComponent: (element: HTMLElement) => AngularComponentInstance | null;
      getAllAngularRootElements: () => HTMLElement[];
      getAngularContext: (element: HTMLElement) => unknown;
      applyChanges: (component: AngularComponentInstance) => void;
      probe: (element: HTMLElement) => AngularDebugElement | null;
    };
    getAllAngularRootElements?: () => HTMLElement[];
    getAngularTestability?: (element: HTMLElement) => unknown;
  }
}

// ============================================
// Detection
// ============================================

/**
 * Check if Angular is detected on the page
 */
export function isAngularDetected(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window.ng !== undefined ||
      window.getAllAngularRootElements !== undefined ||
      document.querySelector('[ng-version]') !== null ||
      document.querySelector('[ng-app]') !== null ||
      document.querySelector('[data-ng-version]') !== null)
  );
}

/**
 * Get Angular version if available
 */
export function getAngularVersion(): string | null {
  // Check for ng-version attribute (Angular 2+)
  const versionElement = document.querySelector('[ng-version]');
  if (versionElement) {
    const version = versionElement.getAttribute('ng-version');
    if (version) return version;
  }

  // Check for data-ng-version
  const dataVersionElement = document.querySelector('[data-ng-version]');
  if (dataVersionElement) {
    const version = dataVersionElement.getAttribute('data-ng-version');
    if (version) return version;
  }

  // Check for AngularJS (1.x)
  if (document.querySelector('[ng-app]')) {
    return '1.x (AngularJS)';
  }

  // Check for ng global
  if (window.ng) {
    return 'detected';
  }

  return null;
}

// ============================================
// Tree Extraction
// ============================================

/**
 * Extract component tree from Angular application
 */
export function extractComponentTree(): ComponentNode | null {
  try {
    // Check for AngularJS (1.x) - use different extraction
    const version = getAngularVersion();
    if (version?.startsWith('1.')) {
      return extractAngularJS1Tree();
    }

    // Use Angular DevTools API if available
    if (window.ng) {
      return extractTreeUsingNgAPI();
    }

    // Fallback to DOM-based extraction
    return extractTreeFromDOM();
  } catch (error) {
    logger.error('[AngularDetector] Failed to extract component tree:', error);
    return extractTreeFromDOM();
  }
}

/**
 * Extract tree using ng global API
 */
function extractTreeUsingNgAPI(): ComponentNode | null {
  const ng = window.ng;
  if (!ng) return null;

  // Get root elements
  let rootElements: HTMLElement[] = [];
  try {
    if (ng.getAllAngularRootElements) {
      rootElements = ng.getAllAngularRootElements();
    } else if (window.getAllAngularRootElements) {
      rootElements = window.getAllAngularRootElements();
    }
  } catch {
    // Fallback: find by attribute
    const appRoot = document.querySelector('[ng-version]');
    if (appRoot) {
      rootElements = [appRoot as HTMLElement];
    }
  }

  if (rootElements.length === 0) {
    return null;
  }

  // Build tree from root elements
  const rootNode: ComponentNode = {
    id: 'angular-root',
    name: 'Angular App',
    type: 'component',
    framework: 'angular' as FrameworkType,
    children: [],
    depth: 0,
    isExpanded: true,
    hasChildren: false,
  };

  for (let i = 0; i < rootElements.length; i++) {
    const rootEl = rootElements[i];
    const debugElement = ng.probe?.(rootEl);

    if (debugElement) {
      const childNode = buildAngularComponentTree(debugElement, 1, i);
      if (childNode) {
        rootNode.children.push(childNode);
      }
    } else {
      // Fallback: create node from element
      const component = ng.getComponent?.(rootEl);
      if (component) {
        rootNode.children.push(buildNodeFromComponent(component, rootEl, 1, i));
      }
    }
  }

  rootNode.hasChildren = rootNode.children.length > 0;
  return rootNode;
}

/**
 * Build component tree from Angular debug element
 */
function buildAngularComponentTree(
  debugElement: AngularDebugElement,
  depth: number,
  index: number
): ComponentNode {
  const name = debugElement.name || getComponentNameFromElement(debugElement);
  const componentInstance = debugElement.componentInstance;

  const node: ComponentNode = {
    id: `angular-${name}-${depth}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: componentInstance ? 'component' : 'element',
    framework: 'angular' as FrameworkType,
    props: extractPropsFromDebugElement(debugElement),
    state: componentInstance ? extractStateFromComponent(componentInstance) : undefined,
    children: [],
    depth,
    domElement: debugElement.nativeElement,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Process children
  if (debugElement.children) {
    for (let i = 0; i < debugElement.children.length; i++) {
      const childNode = buildAngularComponentTree(debugElement.children[i], depth + 1, i);
      node.children.push(childNode);
    }
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Build node from component instance
 */
function buildNodeFromComponent(
  component: AngularComponentInstance,
  element: HTMLElement,
  depth: number,
  index: number
): ComponentNode {
  const name = getComponentName(component);

  const node: ComponentNode = {
    id: `angular-${name}-${depth}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    type: 'component',
    framework: 'angular' as FrameworkType,
    props: extractInputs(component),
    state: extractStateFromComponent(component),
    children: [],
    depth,
    domElement: element,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Look for child components in DOM
  if (depth < 10) {
    const childElements = element.querySelectorAll(':scope > *');
    for (let i = 0; i < childElements.length; i++) {
      const childEl = childElements[i] as HTMLElement;
      const childComponent = window.ng?.getComponent?.(childEl);

      if (childComponent) {
        node.children.push(buildNodeFromComponent(childComponent, childEl, depth + 1, i));
      } else {
        // Add as element node
        node.children.push(domElementToNode(childEl, depth + 1, i));
      }
    }
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Get component name from debug element
 */
function getComponentNameFromElement(debugElement: AngularDebugElement): string {
  if (debugElement.componentInstance) {
    return getComponentName(debugElement.componentInstance);
  }
  return debugElement.name || 'Unknown';
}

/**
 * Get component name from instance
 */
function getComponentName(component: AngularComponentInstance): string {
  // Check constructor name
  if (component.constructor?.name && component.constructor.name !== 'Object') {
    return component.constructor.name;
  }

  // Check Angular component def
  const cmp = component.constructor?.ɵcmp;
  if (cmp?.type?.name) {
    return cmp.type.name;
  }

  // Check for AngularJS scope
  if ('$scope' in component) {
    return 'AngularJS Controller';
  }

  return 'AnonymousComponent';
}

/**
 * Extract props from debug element
 */
function extractPropsFromDebugElement(debugElement: AngularDebugElement): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Add attributes
  if (debugElement.attributes) {
    for (const [key, value] of Object.entries(debugElement.attributes)) {
      if (!key.startsWith('_') && !key.startsWith('ng-')) {
        props[`@${key}`] = value;
      }
    }
  }

  // Add inputs from component
  if (debugElement.componentInstance) {
    const inputs = extractInputs(debugElement.componentInstance);
    Object.assign(props, inputs);
  }

  return props;
}

/**
 * Extract inputs from component
 */
function extractInputs(component: AngularComponentInstance): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};

  // Get input bindings from component def
  const cmp = component.constructor?.ɵcmp;
  if (cmp?.inputs) {
    for (const [propName, bindingName] of Object.entries(cmp.inputs)) {
      inputs[bindingName] = component[propName];
    }
  }

  // Also check for @Input decorated properties
  for (const key of Object.keys(component)) {
    if (!key.startsWith('_') && !key.startsWith('$') && key !== 'constructor') {
      const value = component[key];
      if (typeof value !== 'function') {
        inputs[key] = formatValue(value);
      }
    }
  }

  return inputs;
}

/**
 * Extract state from component
 */
function extractStateFromComponent(component: AngularComponentInstance): Record<string, unknown> {
  const state: Record<string, unknown> = {};

  for (const key of Object.keys(component)) {
    // Skip internal properties
    if (key.startsWith('_') || key.startsWith('__') || key === 'constructor') {
      continue;
    }

    const value = component[key];
    if (typeof value !== 'function') {
      state[key] = formatValue(value);
    }
  }

  return state;
}

// ============================================
// AngularJS 1.x Support
// ============================================

/**
 * Extract tree from AngularJS 1.x
 */
function extractAngularJS1Tree(): ComponentNode | null {
  // Look for ng-app element
  const appElement = document.querySelector('[ng-app]');
  if (!appElement) {
    return extractTreeFromDOM();
  }

  const rootScope = (appElement as unknown as { scope?: () => AngularJS1Scope }).scope?.();
  if (!rootScope) {
    return extractTreeFromDOM();
  }

  return buildAngularJS1Tree(rootScope, 0);
}

interface AngularJS1Scope {
  $id: string;
  $$childScopes?: AngularJS1Scope[];
  $$childHead?: AngularJS1Scope;
  $$nextSibling?: AngularJS1Scope;
  $parent?: AngularJS1Scope;
  [key: string]: unknown;
}

/**
 * Build tree from AngularJS 1.x scope
 */
function buildAngularJS1Tree(scope: AngularJS1Scope, depth: number): ComponentNode {
  const node: ComponentNode = {
    id: `angularjs-scope-${scope.$id}`,
    name: `Scope ${scope.$id}`,
    type: 'component',
    framework: 'angular',
    state: extractScopeData(scope),
    children: [],
    depth,
    isExpanded: depth < 2,
    hasChildren: false,
  };

  // Process child scopes
  let childScope = scope.$$childHead;
  while (childScope) {
    node.children.push(buildAngularJS1Tree(childScope, depth + 1));
    childScope = childScope.$$nextSibling;
  }

  node.hasChildren = node.children.length > 0;
  return node;
}

/**
 * Extract data from AngularJS scope
 */
function extractScopeData(scope: AngularJS1Scope): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const key of Object.keys(scope)) {
    if (!key.startsWith('$') && !key.startsWith('$$')) {
      data[key] = formatValue(scope[key]);
    }
  }

  return data;
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
    if (Array.isArray(value)) {
      if (value.length > 5) {
        return [...value.slice(0, 5), `...(${value.length - 5} more)`];
      }
      return value.map(formatValue);
    }

    // Skip certain Angular internal objects
    if ('__ngContext__' in value || value.constructor?.name?.includes('Subscription')) {
      return '[Angular Internal]';
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
        if (!key.startsWith('_') && !key.startsWith('$')) {
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

// ============================================
// Fallback DOM Extraction
// ============================================

/**
 * Extract tree from DOM as fallback
 */
function extractTreeFromDOM(): ComponentNode | null {
  const appElement =
    document.querySelector('[ng-version]') ||
    document.querySelector('[ng-app]') ||
    document.body;

  if (!appElement) return null;

  const angularVersion = appElement.getAttribute('ng-version') ||
    appElement.getAttribute('data-ng-version') ||
    'unknown';

  return {
    id: 'angular-root',
    name: `Angular App (${angularVersion})`,
    type: 'component',
    framework: 'angular',
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

  // Check if element has Angular bindings
  const hasBindings = element.hasAttribute('[ng-reflect-') ||
    element.hasAttribute('ng-reflect-');

  return {
    id: `dom-${element.tagName}-${depth}-${index}`,
    name: element.tagName.toLowerCase(),
    type: hasBindings ? 'component' : 'element',
    framework: 'angular',
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
  const attrs = ['id', 'class', 'ng-version', 'data-ng-version'];

  for (const attr of attrs) {
    const value = element.getAttribute(attr);
    if (value) {
      props[attr] = value;
    }
  }

  // Add Angular-specific attributes
  const ngReflectAttrs = Array.from(element.attributes)
    .filter((attr) => attr.name.startsWith('ng-reflect-') || attr.name.startsWith('_ngcontent'));

  for (const attr of ngReflectAttrs.slice(0, 5)) {
    props[attr.name] = attr.value;
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

    element.style.outline = '2px solid #dd0031';
    element.style.boxShadow = '0 0 0 4px rgba(221, 0, 49, 0.3)';

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
    }, 3000);
  }
}
