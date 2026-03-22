/**
 * Component Tree Visualizer Module
 *
 * Main module that coordinates framework detection and component tree visualization.
 * Supports React, Vue, Angular, and Svelte.
 *
 * Features:
 * - Automatic framework detection
 * - Component tree extraction and display
 * - Expand/collapse tree nodes
 * - Component highlighting on click
 * - Shadow DOM UI isolation
 */

import type { ComponentNode, ComponentTreeState, FrameworkType } from '@/types';
import { logger } from '@/utils/logger';

// Import framework detectors
import {
  extractComponentTree as extractAngularTree,
  highlightComponent as highlightAngularComponent,
  isAngularDetected,
} from './framework-detectors/angular-detector';
import {
  extractComponentTree as extractReactTree,
  highlightComponent as highlightReactComponent,
  isReactDetected,
} from './framework-detectors/react-detector';
import {
  extractComponentTree as extractSvelteTree,
  highlightComponent as highlightSvelteComponent,
  isSvelteDetected,
} from './framework-detectors/svelte-detector';
import {
  extractComponentTree as extractVueTree,
  highlightComponent as highlightVueComponent,
  isVueDetected,
} from './framework-detectors/vue-detector';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-component-tree';
const REFRESH_INTERVAL = 5000;

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;

const state: ComponentTreeState = {
  framework: 'unknown',
  root: null,
  selectedNode: null,
  expandedNodes: new Set(),
  filter: '',
};

// ============================================
// Public API
// ============================================

/**
 * Enable the component tree visualizer
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  // Detect framework
  detectFramework();

  // Create panel
  createPanel();

  // Start auto-refresh
  startAutoRefresh();

  logger.log('[ComponentTree] Enabled, detected framework:', state.framework);
}

/**
 * Disable the component tree visualizer
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  // Destroy panel
  destroyPanel();

  // Stop auto-refresh
  stopAutoRefresh();

  // Clear state
  state.root = null;
  state.selectedNode = null;
  state.expandedNodes.clear();

  logger.log('[ComponentTree] Disabled');
}

/**
 * Toggle the component tree visualizer
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): ComponentTreeState & { enabled: boolean; isPanelOpen: boolean } {
  return {
    ...state,
    enabled: isEnabled,
    isPanelOpen,
  };
}

/**
 * Refresh the component tree
 */
export async function refresh(): Promise<void> {
  if (!isEnabled) return;

  await extractComponentTree();
  renderTree();
}

/**
 * Select a component node
 */
export function selectNode(nodeId: string): void {
  const node = findNodeById(state.root, nodeId);
  if (node) {
    state.selectedNode = node;
    highlightComponent(node);
    renderTree();
  }
}

/**
 * Toggle expand/collapse for a node
 */
export function toggleNode(nodeId: string): void {
  if (state.expandedNodes.has(nodeId)) {
    state.expandedNodes.delete(nodeId);
  } else {
    state.expandedNodes.add(nodeId);
  }
  renderTree();
}

/**
 * Expand all nodes
 */
export function expandAll(): void {
  if (!state.root) return;

  const addNodeIds = (node: ComponentNode): void => {
    state.expandedNodes.add(node.id);
    for (const child of node.children) {
      addNodeIds(child);
    }
  };

  addNodeIds(state.root);
  renderTree();
}

/**
 * Collapse all nodes
 */
export function collapseAll(): void {
  state.expandedNodes.clear();
  if (state.root) {
    state.expandedNodes.add(state.root.id);
  }
  renderTree();
}

/**
 * Set filter text
 */
export function setFilter(filter: string): void {
  state.filter = filter.toLowerCase();
  renderTree();
}

// ============================================
// Framework Detection
// ============================================

/**
 * Detect which framework is being used
 */
function detectFramework(): FrameworkType {
  // Check each framework in order
  if (isReactDetected()) {
    state.framework = 'react';
  } else if (isVueDetected()) {
    state.framework = 'vue';
  } else if (isAngularDetected()) {
    state.framework = 'angular';
  } else if (isSvelteDetected()) {
    state.framework = 'svelte';
  } else {
    state.framework = 'unknown';
  }

  return state.framework;
}

/**
 * Extract component tree from the detected framework
 */
async function extractComponentTree(): Promise<void> {
  try {
    let root: ComponentNode | null = null;

    switch (state.framework) {
      case 'react':
        root = extractReactTree();
        break;
      case 'vue':
        root = extractVueTree();
        break;
      case 'angular':
        root = extractAngularTree();
        break;
      case 'svelte':
        root = extractSvelteTree();
        break;
      default:
        // Try all detectors as fallback
        root =
          extractReactTree() ||
          extractVueTree() ||
          extractAngularTree() ||
          extractSvelteTree() ||
          extractGenericTree();
    }

    state.root = root;

    // Auto-expand root and first level
    if (root) {
      state.expandedNodes.add(root.id);
      for (const child of root.children) {
        if (child.depth < 2) {
          state.expandedNodes.add(child.id);
        }
      }
    }
  } catch (error) {
    logger.error('[ComponentTree] Failed to extract tree:', error);
    state.root = null;
  }
}

/**
 * Extract generic DOM tree when no framework detected
 */
function extractGenericTree(): ComponentNode | null {
  const body = document.body;
  if (!body) return null;

  return {
    id: 'generic-root',
    name: 'DOM Tree',
    type: 'element',
    framework: 'unknown',
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
    framework: 'unknown',
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
function highlightComponent(node: ComponentNode): void {
  switch (node.framework) {
    case 'react':
      highlightReactComponent(node);
      break;
    case 'vue':
      highlightVueComponent(node);
      break;
    case 'angular':
      highlightAngularComponent(node);
      break;
    case 'svelte':
      highlightSvelteComponent(node);
      break;
    default:
      // Generic highlighting
      if (node.domElement) {
        const element = node.domElement;
        const originalOutline = element.style.outline;
        element.style.outline = '2px solid #6366f1';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          element.style.outline = originalOutline;
        }, 3000);
      }
  }
}

// ============================================
// Tree Utilities
// ============================================

/**
 * Find a node by ID in the tree
 */
function findNodeById(node: ComponentNode | null, id: string): ComponentNode | null {
  if (!node) return null;
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Check if node matches filter
 */
function nodeMatchesFilter(node: ComponentNode, filter: string): boolean {
  if (!filter) return true;

  // Check node name
  if (node.name.toLowerCase().includes(filter)) return true;

  // Check props
  if (node.props) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key.toLowerCase().includes(filter)) return true;
      if (String(value).toLowerCase().includes(filter)) return true;
    }
  }

  return false;
}

/**
 * Filter tree based on search text
 */
function filterTree(node: ComponentNode, filter: string): ComponentNode | null {
  if (!filter) return node;

  const matches = nodeMatchesFilter(node, filter);

  // Filter children
  const filteredChildren: ComponentNode[] = [];
  for (const child of node.children) {
    const filteredChild = filterTree(child, filter);
    if (filteredChild) {
      filteredChildren.push(filteredChild);
    }
  }

  // Include node if it matches or has matching children
  if (matches || filteredChildren.length > 0) {
    return {
      ...node,
      children: filteredChildren,
      isExpanded: true, // Auto-expand filtered results
    };
  }

  return null;
}

// ============================================
// UI Panel
// ============================================

function createPanel(): void {
  if (panelContainer) return;

  panelContainer = document.createElement('div');
  panelContainer.id = `${PREFIX}-container`;
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = getPanelHTML();
  shadowRoot.appendChild(panel);

  // Add event listeners
  setupEventListeners(panel);

  document.body.appendChild(panelContainer);
  isPanelOpen = true;

  // Initial render
  refresh();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  isPanelOpen = false;
}

function getPanelHTML(): string {
  const frameworkIcon = getFrameworkIcon(state.framework);
  const frameworkLabel = state.framework.charAt(0).toUpperCase() + state.framework.slice(1);

  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>${frameworkIcon}</span>
        <span>Component Tree</span>
        <span id="${PREFIX}-framework" class="${PREFIX}-badge">${frameworkLabel}</span>
      </div>
      <div id="${PREFIX}-actions">
        <button id="${PREFIX}-refresh" title="Refresh">🔄</button>
        <button id="${PREFIX}-expand-all" title="Expand All">⬇️</button>
        <button id="${PREFIX}-collapse-all" title="Collapse All">➡️</button>
        <button id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-toolbar">
      <input type="text" id="${PREFIX}-search" placeholder="Filter components..." />
    </div>
    
    <div id="${PREFIX}-content">
      <div class="${PREFIX}-loading">Detecting framework...</div>
    </div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-stats">0 components</span>
      <span id="${PREFIX}-status">Ready</span>
    </div>
  `;
}

function getFrameworkIcon(framework: FrameworkType): string {
  switch (framework) {
    case 'react':
      return '⚛️';
    case 'vue':
      return '🟢';
    case 'angular':
      return '🅰️';
    case 'svelte':
      return '🔶';
    default:
      return '🌲';
  }
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  // Expand all button
  panel.querySelector(`#${PREFIX}-expand-all`)?.addEventListener('click', () => {
    expandAll();
    updateStatus('Expanded all');
  });

  // Collapse all button
  panel.querySelector(`#${PREFIX}-collapse-all`)?.addEventListener('click', () => {
    collapseAll();
    updateStatus('Collapsed all');
  });

  // Search input
  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    setFilter(value);
  });

  // Tree click delegation
  const content = panel.querySelector(`#${PREFIX}-content`);
  content?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('[data-node-id]') as HTMLElement;
    if (!nodeEl) return;

    const nodeId = nodeEl.getAttribute('data-node-id');
    if (!nodeId) return;

    // Check if expand/collapse button clicked
    if (target.closest(`.${PREFIX}-toggle`)) {
      toggleNode(nodeId);
    } else {
      // Select node
      selectNode(nodeId);
    }
  });
}

function renderTree(): void {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  if (!state.root) {
    content.innerHTML = `<div class="${PREFIX}-empty">No component tree detected</div>`;
    updateStats(0);
    return;
  }

  // Apply filter
  const filteredRoot = state.filter ? filterTree(state.root, state.filter) : state.root;

  if (!filteredRoot) {
    content.innerHTML = `<div class="${PREFIX}-empty">No components match filter</div>`;
    updateStats(0);
    return;
  }

  // Count total nodes
  let nodeCount = 0;
  const countNodes = (node: ComponentNode): void => {
    nodeCount++;
    for (const child of node.children) {
      countNodes(child);
    }
  };
  countNodes(filteredRoot);

  // Render tree
  content.innerHTML = renderNode(filteredRoot);
  updateStats(nodeCount);
}

function renderNode(node: ComponentNode): string {
  const isExpanded = state.expandedNodes.has(node.id);
  const isSelected = state.selectedNode?.id === node.id;
  const hasChildren = node.hasChildren;

  const indent = node.depth * 16;
  const toggleIcon = isExpanded ? '▼' : '▶';
  const typeIcon = getTypeIcon(node.type);
  const frameworkIcon = getFrameworkIcon(node.framework);

  let html = `
    <div 
      class="${PREFIX}-node ${isSelected ? `${PREFIX}-selected` : ''}" 
      data-node-id="${escapeHtml(node.id)}"
      style="padding-left: ${indent}px"
    >
      <div class="${PREFIX}-node-content">
        ${
          hasChildren
            ? `<span class="${PREFIX}-toggle">${toggleIcon}</span>`
            : `<span class="${PREFIX}-toggle-placeholder"></span>`
        }
        <span class="${PREFIX}-type-icon">${typeIcon}</span>
        <span class="${PREFIX}-framework-icon">${frameworkIcon}</span>
        <span class="${PREFIX}-node-name" title="${escapeHtml(getNodeTooltip(node))}">${escapeHtml(node.name)}</span>
        ${
          node.props && Object.keys(node.props).length > 0
            ? `<span class="${PREFIX}-props-badge">${Object.keys(node.props).length}</span>`
            : ''
        }
      </div>
    </div>
  `;

  // Render children if expanded
  if (isExpanded && node.children.length > 0) {
    for (const child of node.children) {
      html += renderNode(child);
    }
  }

  return html;
}

function getTypeIcon(type: ComponentNode['type']): string {
  switch (type) {
    case 'component':
      return '⚙️';
    case 'element':
      return '📄';
    case 'text':
      return '📝';
    case 'fragment':
      return '🧩';
    default:
      return '📦';
  }
}

function getNodeTooltip(node: ComponentNode): string {
  let tooltip = `${node.type}: ${node.name}`;
  if (node.props && Object.keys(node.props).length > 0) {
    tooltip += `\nProps: ${Object.keys(node.props).join(', ')}`;
  }
  if (node.state && Object.keys(node.state).length > 0) {
    tooltip += `\nState: ${Object.keys(node.state).join(', ')}`;
  }
  return tooltip;
}

function updateStats(count: number): void {
  const statsEl = shadowRoot?.querySelector(`#${PREFIX}-stats`);
  if (statsEl) {
    statsEl.textContent = `${count} component${count !== 1 ? 's' : ''}`;
  }
}

function updateStatus(message: string): void {
  const statusEl = shadowRoot?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, 2000);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Auto Refresh
// ============================================

function startAutoRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    refresh();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

// ============================================
// Styles
// ============================================

function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    }

    #${PREFIX}-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    #${PREFIX}-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    #${PREFIX}-framework {
      background: #4f46e5;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }

    #${PREFIX}-actions {
      display: flex;
      gap: 4px;
    }

    #${PREFIX}-actions button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.15s ease;
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    #${PREFIX}-toolbar {
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
    }

    #${PREFIX}-search {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 13px;
      box-sizing: border-box;
    }

    #${PREFIX}-search:focus {
      outline: none;
      border-color: #4f46e5;
    }

    #${PREFIX}-search::placeholder {
      color: #64748b;
    }

    #${PREFIX}-content {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      min-height: 200px;
    }

    .${PREFIX}-loading,
    .${PREFIX}-empty {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .${PREFIX}-node {
      cursor: pointer;
      user-select: none;
    }

    .${PREFIX}-node-content {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      transition: background 0.1s ease;
    }

    .${PREFIX}-node:hover .${PREFIX}-node-content {
      background: #1e293b;
    }

    .${PREFIX}-selected .${PREFIX}-node-content {
      background: #4f46e5 !important;
      color: white;
    }

    .${PREFIX}-toggle {
      font-size: 10px;
      width: 14px;
      height: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      cursor: pointer;
    }

    .${PREFIX}-toggle-placeholder {
      width: 14px;
    }

    .${PREFIX}-type-icon,
    .${PREFIX}-framework-icon {
      font-size: 12px;
      width: 16px;
      text-align: center;
    }

    .${PREFIX}-node-name {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }

    .${PREFIX}-props-badge {
      background: #334155;
      color: #94a3b8;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
    }

    .${PREFIX}-selected .${PREFIX}-props-badge {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      font-size: 11px;
      color: #64748b;
      background: #1e293b;
    }

    /* Scrollbar styling */
    #${PREFIX}-content::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}

// ============================================
// Export singleton
// ============================================

export const componentTree = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  selectNode,
  toggleNode,
  expandAll,
  collapseAll,
  setFilter,
};
