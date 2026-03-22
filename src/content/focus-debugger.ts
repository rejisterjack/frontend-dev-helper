/**
 * Focus Debugger Module
 *
 * Comprehensive focus debugging tool that provides:
 * - Visualize focus order with numbered overlays
 * - Detect focus traps (elements that trap keyboard navigation)
 * - Show all focusable elements with tab index
 * - Track focus history
 * - Highlight current focused element
 * - Show focus outline issues
 */

import type { FocusableElement, FocusDebuggerState, FocusHistoryEntry } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-focus-debugger';
const REFRESH_INTERVAL = 2000;
const FOCUS_HISTORY_LIMIT = 50;

// Selectors for focusable elements
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'details',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'audio[controls]',
  'video[controls]',
  'iframe',
  'embed',
  'object',
].join(', ');

// ============================================
// State
// ============================================

let isEnabled = false;
let isPanelOpen = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;
let mutationObserver: MutationObserver | null = null;
let focusableElements: FocusableElement[] = [];
let focusHistory: FocusHistoryEntry[] = [];
let currentFocusedElement: HTMLElement | null = null;
let trapElements: HTMLElement[] = [];
let overlaysContainer: HTMLElement | null = null;
let lastKeyboardFocusTime = 0;
let currentTab: 'elements' | 'history' | 'issues' = 'elements';

// ============================================
// Public API
// ============================================

/**
 * Enable the focus debugger
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  startAutoRefresh();
  startMutationObserver();
  attachEventListeners();
  scanFocusableElements();
  updateOverlays();

  logger.log('[FocusDebugger] Enabled');
}

/**
 * Disable the focus debugger
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  removeOverlays();
  stopAutoRefresh();
  stopMutationObserver();
  detachEventListeners();

  focusableElements = [];
  currentFocusedElement = null;
  trapElements = [];

  logger.log('[FocusDebugger] Disabled');
}

/**
 * Toggle the focus debugger
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
export function getState(): FocusDebuggerState {
  return {
    enabled: isEnabled,
    showOverlay: isPanelOpen,
    focusableElements,
    focusHistory: [...focusHistory],
    trapDetected: trapElements.length > 0,
    trapElements: [...trapElements],
  };
}

/**
 * Refresh focus data
 */
export function refresh(): void {
  if (!isEnabled) return;
  scanFocusableElements();
  detectFocusTraps();
  updateOverlays();
  renderCurrentTab();
}

/**
 * Clear focus history
 */
export function clearHistory(): void {
  focusHistory = [];
  renderCurrentTab();
  logger.log('[FocusDebugger] History cleared');
}

// ============================================
// Focusable Element Detection
// ============================================

function scanFocusableElements(): void {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

  focusableElements = elements
    .filter((el) => isElementVisible(el) && !isElementDisabled(el))
    .map((el, index) => ({
      element: el,
      selector: generateSelector(el),
      tabIndex: el.tabIndex,
      tabOrder: index + 1,
      isVisible: true,
      isDisabled: false,
      ariaLabel: el.getAttribute('aria-label') || undefined,
    }))
    .sort((a, b) => {
      // Sort by tabIndex first (0 comes after positive indices)
      const aTabIndex = a.tabIndex === 0 ? Number.MAX_SAFE_INTEGER : a.tabIndex;
      const bTabIndex = b.tabIndex === 0 ? Number.MAX_SAFE_INTEGER : b.tabIndex;
      if (aTabIndex !== bTabIndex) {
        return aTabIndex - bTabIndex;
      }
      // Then by DOM order
      return a.tabOrder - b.tabOrder;
    })
    .map((el, index) => ({ ...el, tabOrder: index + 1 }));
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none' &&
    style.opacity !== '0'
  );
}

function isElementDisabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  );
}

function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const tagName = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .join('.');

  if (classes) {
    return `${tagName}.${classes}`;
  }

  // Generate path with index
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    const parentEl: HTMLElement | null = current.parentElement;

    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter(
        (child): child is HTMLElement => (child as HTMLElement).tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parentEl;
  }

  return path.join(' > ');
}

// ============================================
// Focus Trap Detection
// ============================================

function detectFocusTraps(): void {
  trapElements = [];

  // Check for elements with positive tabIndex (can create tab traps)
  const positiveTabIndex = focusableElements.filter((el) => el.tabIndex > 0);
  if (positiveTabIndex.length > 1) {
    // Multiple positive tab indices can create confusing navigation
    logger.warn('[FocusDebugger] Multiple positive tab indices found:', positiveTabIndex);
  }

  // Check for hidden/disabled elements in tab order
  focusableElements.forEach((el) => {
    const element = el.element;
    
    // Check for elements that might trap focus
    const style = window.getComputedStyle(element);
    const parent = element.parentElement;

    if (parent) {
      const parentStyle = window.getComputedStyle(parent);
      
      // Check for overflow hidden with focusable children
      if (
        parentStyle.overflow === 'hidden' &&
        (element.offsetLeft < 0 || element.offsetTop < 0)
      ) {
        trapElements.push(element);
      }
    }

    // Check for position fixed/sticky that might overlay content
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = element.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
        // Large overlay that might trap focus
        trapElements.push(element);
      }
    }
  });

  // Remove duplicates
  trapElements = [...new Set(trapElements)];
}

// ============================================
// Event Handlers
// ============================================

function attachEventListeners(): void {
  document.addEventListener('focusin', handleFocusIn, true);
  document.addEventListener('focusout', handleFocusOut, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('click', handleClick, true);
}

function detachEventListeners(): void {
  document.removeEventListener('focusin', handleFocusIn, true);
  document.removeEventListener('focusout', handleFocusOut, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('click', handleClick, true);
}

function handleFocusIn(event: FocusEvent): void {
  const target = event.target as HTMLElement;
  if (!target) return;

  currentFocusedElement = target;

  // Determine trigger type
  let trigger: 'keyboard' | 'mouse' | 'script' = 'script';
  if (Date.now() - lastKeyboardFocusTime < 100) {
    trigger = 'keyboard';
  } else if (event.relatedTarget === null && document.hasFocus()) {
    trigger = 'mouse';
  }

  // Add to history
  addToHistory(target, trigger);

  // Update overlays
  updateOverlays();

  // Update panel if open
  if (isPanelOpen) {
    highlightCurrentElement();
  }
}

function handleFocusOut(_event: FocusEvent): void {
  // Could track focus leaving elements
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    lastKeyboardFocusTime = Date.now();
  }

  // Handle panel shortcuts
  if (!isPanelOpen) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    disable();
  }
}

function handleMouseDown(): void {
  // Reset keyboard focus time on mouse interaction
  lastKeyboardFocusTime = 0;
}

function handleClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  
  // Check if clicked on an overlay
  if (target?.closest(`.${PREFIX}-overlay`)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function addToHistory(element: HTMLElement, trigger: 'keyboard' | 'mouse' | 'script'): void {
  const entry: FocusHistoryEntry = {
    timestamp: Date.now(),
    element: element.tagName.toLowerCase(),
    selector: generateSelector(element),
    trigger,
  };

  focusHistory.unshift(entry);

  // Limit history size
  if (focusHistory.length > FOCUS_HISTORY_LIMIT) {
    focusHistory = focusHistory.slice(0, FOCUS_HISTORY_LIMIT);
  }

  // Update history tab if active
  if (isPanelOpen && currentTab === 'history') {
    renderCurrentTab();
  }
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
    width: 500px;
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
  renderCurrentTab();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
  isPanelOpen = false;
}

function getPanelHTML(): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>🎯</span>
        <span>Focus Debugger</span>
      </div>
      <div id="${PREFIX}-actions">
        <button id="${PREFIX}-refresh" title="Refresh">🔄</button>
        <button id="${PREFIX}-toggle-overlays" title="Toggle Overlays">👁️</button>
        <button id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-tabs">
      <button class="${PREFIX}-tab active" data-tab="elements">
        Elements
        <span class="${PREFIX}-badge" id="${PREFIX}-elements-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="history">
        History
        <span class="${PREFIX}-badge" id="${PREFIX}-history-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="issues">
        Issues
        <span class="${PREFIX}-badge" id="${PREFIX}-issues-count">0</span>
      </button>
    </div>
    
    <div id="${PREFIX}-toolbar">
      <input type="text" id="${PREFIX}-search" placeholder="Search elements..." />
    </div>
    
    <div id="${PREFIX}-content"></div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-stats"></span>
      <span id="${PREFIX}-status">Ready</span>
    </div>
  `;
}

function setupEventListeners(panel: HTMLElement): void {
  // Close button
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  // Refresh button
  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  // Toggle overlays button
  panel.querySelector(`#${PREFIX}-toggle-overlays`)?.addEventListener('click', () => {
    toggleOverlays();
  });

  // Tab switching
  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as typeof currentTab;
      switchTab(tabName);
    });
  });

  // Search
  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    filterContent(query);
  });
}

function switchTab(tab: typeof currentTab): void {
  currentTab = tab;

  // Update tab UI
  shadowRoot?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  renderCurrentTab();
}

function renderCurrentTab(): void {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  switch (currentTab) {
    case 'elements':
      content.innerHTML = renderElements();
      break;
    case 'history':
      content.innerHTML = renderHistory();
      break;
    case 'issues':
      content.innerHTML = renderIssues();
      break;
  }

  updateStats();
  updateBadges();
}

function renderElements(): string {
  if (focusableElements.length === 0) {
    return `<div class="${PREFIX}-empty">No focusable elements found</div>`;
  }

  return `
    <div class="${PREFIX}-info">${focusableElements.length} focusable elements</div>
    <div class="${PREFIX}-list">
      ${focusableElements
        .map(
          (el) => `
        <div class="${PREFIX}-item ${el.element === currentFocusedElement ? `${PREFIX}-current` : ''}" 
             data-selector="${escapeHtml(el.selector)}"
             data-taborder="${el.tabOrder}">
          <div class="${PREFIX}-item-header">
            <span class="${PREFIX}-tab-order">${el.tabOrder}</span>
            <span class="${PREFIX}-item-tag">${el.element.tagName.toLowerCase()}</span>
            ${el.tabIndex !== 0 ? `<span class="${PREFIX}-tab-index">tabindex="${el.tabIndex}"</span>` : ''}
            ${el.ariaLabel ? `<span class="${PREFIX}-aria-label" title="${escapeHtml(el.ariaLabel)}">♿</span>` : ''}
          </div>
          <div class="${PREFIX}-item-selector">${escapeHtml(el.selector)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderHistory(): string {
  if (focusHistory.length === 0) {
    return `
      <div class="${PREFIX}-empty">
        <div>No focus history yet</div>
        <div class="${PREFIX}-empty-hint">Tab through elements to build history</div>
      </div>
    `;
  }

  return `
    <div class="${PREFIX}-toolbar-secondary">
      <button id="${PREFIX}-clear-history">Clear History</button>
    </div>
    <div class="${PREFIX}-info">${focusHistory.length} focus events</div>
    <div class="${PREFIX}-list">
      ${focusHistory
        .map(
          (entry, index) => `
        <div class="${PREFIX}-history-item" data-index="${index}">
          <div class="${PREFIX}-history-header">
            <span class="${PREFIX}-history-trigger ${PREFIX}-trigger-${entry.trigger}">${getTriggerIcon(entry.trigger)}</span>
            <span class="${PREFIX}-history-element">${entry.element}</span>
            <span class="${PREFIX}-history-time">${formatTime(entry.timestamp)}</span>
          </div>
          <div class="${PREFIX}-history-selector">${escapeHtml(entry.selector)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderIssues(): string {
  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; element?: string }> = [];

  // Check for missing focus indicators
  focusableElements.forEach((el) => {
    const style = window.getComputedStyle(el.element);
    const outline = style.outline;
    const outlineWidth = parseFloat(style.outlineWidth);
    
    if (outline === 'none' || outlineWidth === 0) {
      issues.push({
        type: 'warning',
        message: 'Missing visible focus indicator',
        element: el.selector,
      });
    }
  });

  // Check for positive tab indices
  const positiveTabIndices = focusableElements.filter((el) => el.tabIndex > 0);
  if (positiveTabIndices.length > 1) {
    issues.push({
      type: 'warning',
      message: `Multiple positive tabindex values found (${positiveTabIndices.length}) - can create confusing tab order`,
    });
  }

  // Check for elements without labels
  focusableElements.forEach((el) => {
    const element = el.element;
    const hasLabel =
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      ((element as HTMLInputElement).labels && (element as HTMLInputElement).labels!.length > 0) ||
      !!element.getAttribute('title');

    if (!hasLabel && ['input', 'textarea', 'select', 'button'].includes(element.tagName.toLowerCase())) {
      issues.push({
        type: 'error',
        message: 'Focusable element missing accessible label',
        element: el.selector,
      });
    }
  });

  // Check for hidden focusable elements
  focusableElements.forEach((el) => {
    const rect = el.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      issues.push({
        type: 'warning',
        message: 'Focusable element has zero dimensions',
        element: el.selector,
      });
    }
  });

  if (issues.length === 0) {
    return `
      <div class="${PREFIX}-empty">
        <div>✅ No issues found</div>
        <div class="${PREFIX}-empty-hint">All focusable elements look good!</div>
      </div>
    `;
  }

  return `
    <div class="${PREFIX}-info">${issues.length} issue${issues.length !== 1 ? 's' : ''} found</div>
    <div class="${PREFIX}-list">
      ${issues
        .map(
          (issue) => `
        <div class="${PREFIX}-issue ${PREFIX}-issue-${issue.type}">
          <div class="${PREFIX}-issue-header">
            <span class="${PREFIX}-issue-icon">${getIssueIcon(issue.type)}</span>
            <span class="${PREFIX}-issue-type">${issue.type.toUpperCase()}</span>
          </div>
          <div class="${PREFIX}-issue-message">${escapeHtml(issue.message)}</div>
          ${issue.element ? `<div class="${PREFIX}-issue-element">${escapeHtml(issue.element)}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// ============================================
// Overlays
// ============================================

let overlaysVisible = true;

function toggleOverlays(): void {
  overlaysVisible = !overlaysVisible;
  updateOverlays();
  updateStatus(overlaysVisible ? 'Overlays shown' : 'Overlays hidden');
}

function updateOverlays(): void {
  if (!overlaysVisible) {
    removeOverlays();
    return;
  }

  // Create or get overlays container
  if (!overlaysContainer) {
    overlaysContainer = document.createElement('div');
    overlaysContainer.id = `${PREFIX}-overlays-container`;
    document.body.appendChild(overlaysContainer);
  }

  overlaysContainer.innerHTML = '';

  // Add number overlays for each focusable element
  focusableElements.forEach((el) => {
    const rect = el.element.getBoundingClientRect();
    
    // Skip elements outside viewport
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = `${PREFIX}-overlay`;
    
    const isCurrent = el.element === currentFocusedElement;
    
    overlay.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      z-index: 2147483645;
      border: ${isCurrent ? '3px solid #22c55e' : '2px solid #4f46e5'};
      border-radius: 3px;
      box-shadow: ${isCurrent ? '0 0 0 3px rgba(34, 197, 94, 0.3)' : '0 0 0 2px rgba(79, 70, 229, 0.2)'};
    `;

    // Add number badge
    const badge = document.createElement('div');
    badge.className = `${PREFIX}-overlay-badge`;
    badge.textContent = String(el.tabOrder);
    badge.style.cssText = `
      position: absolute;
      top: -10px;
      left: -10px;
      background: ${isCurrent ? '#22c55e' : '#4f46e5'};
      color: white;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
      font-family: monospace;
    `;

    overlay.appendChild(badge);
    overlaysContainer!.appendChild(overlay);
  });
}

function removeOverlays(): void {
  overlaysContainer?.remove();
  overlaysContainer = null;
}

function highlightCurrentElement(): void {
  // Re-render to update current element highlighting
  if (currentTab === 'elements') {
    renderCurrentTab();
  }
}

// ============================================
// Utilities
// ============================================

function getTriggerIcon(trigger: 'keyboard' | 'mouse' | 'script'): string {
  switch (trigger) {
    case 'keyboard':
      return '⌨️';
    case 'mouse':
      return '🖱️';
    case 'script':
      return '⚡';
  }
}

function getIssueIcon(type: 'error' | 'warning' | 'info'): string {
  switch (type) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function updateStats(): void {
  const statsEl = shadowRoot?.querySelector(`#${PREFIX}-stats`);
  if (statsEl) {
    const current = currentFocusedElement
      ? focusableElements.find((el) => el.element === currentFocusedElement)?.tabOrder || '-'
      : '-';
    statsEl.textContent = `Focus: ${current} / ${focusableElements.length}`;
  }
}

function updateBadges(): void {
  updateBadge('elements', focusableElements.length);
  updateBadge('history', focusHistory.length);
  
  const issueCount = shadowRoot?.querySelectorAll(`.${PREFIX}-issue`).length || 0;
  updateBadge('issues', issueCount);
}

function updateBadge(type: string, count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

function filterContent(query: string): void {
  const items = shadowRoot?.querySelectorAll(`.${PREFIX}-item, .${PREFIX}-history-item, .${PREFIX}-issue`);
  items?.forEach((item) => {
    const text = item.textContent?.toLowerCase() || '';
    (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

// ============================================
// Auto-refresh & Mutation Observer
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

function startMutationObserver(): void {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    let shouldRefresh = false;

    for (const mutation of mutations) {
      // Check if any focusable elements were added/removed
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (isFocusableElement(node) || node.querySelector(FOCUSABLE_SELECTORS)) {
              shouldRefresh = true;
              break;
            }
          }
        }
        for (const node of mutation.removedNodes) {
          if (node instanceof HTMLElement) {
            if (isFocusableElement(node) || node.querySelector(FOCUSABLE_SELECTORS)) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }

      // Check for tabindex changes
      if (mutation.type === 'attributes' && mutation.attributeName === 'tabindex') {
        shouldRefresh = true;
      }

      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      // Debounce refresh
      clearTimeout((refresh as unknown as { _timeout: number })._timeout);
      (refresh as unknown as { _timeout: number })._timeout = window.setTimeout(refresh, 100);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['tabindex', 'disabled', 'hidden', 'style'],
  });
}

function stopMutationObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

function isFocusableElement(element: HTMLElement): boolean {
  return element.matches?.(FOCUSABLE_SELECTORS) || false;
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
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    #${PREFIX}-tabs {
      display: flex;
      overflow-x: auto;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    .${PREFIX}-tab {
      flex: 1;
      min-width: 100px;
      padding: 10px 12px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .${PREFIX}-tab:hover {
      color: #e2e8f0;
      background: #334155;
    }

    .${PREFIX}-tab.active {
      color: #f8fafc;
      background: #0f172a;
      border-bottom: 2px solid #4f46e5;
    }

    .${PREFIX}-badge {
      background: #334155;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      min-width: 18px;
      text-align: center;
    }

    #${PREFIX}-toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
    }

    .${PREFIX}-toolbar-secondary {
      display: flex;
      gap: 8px;
      padding: 0 12px 12px;
    }

    #${PREFIX}-toolbar button,
    .${PREFIX}-toolbar-secondary button {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
    }

    #${PREFIX}-toolbar button:hover,
    .${PREFIX}-toolbar-secondary button:hover {
      background: #475569;
    }

    #${PREFIX}-search {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 13px;
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
      padding: 12px;
      min-height: 200px;
    }

    .${PREFIX}-loading,
    .${PREFIX}-empty {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .${PREFIX}-empty-hint {
      font-size: 12px;
      margin-top: 8px;
      opacity: 0.7;
    }

    .${PREFIX}-info {
      padding: 8px 12px;
      background: #1e293b;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      color: #94a3b8;
    }

    .${PREFIX}-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .${PREFIX}-item,
    .${PREFIX}-history-item,
    .${PREFIX}-issue {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
    }

    .${PREFIX}-item.${PREFIX}-current {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
    }

    .${PREFIX}-item-header,
    .${PREFIX}-history-header,
    .${PREFIX}-issue-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .${PREFIX}-tab-order {
      background: #4f46e5;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      min-width: 20px;
      text-align: center;
    }

    .${PREFIX}-item-tag {
      font-weight: 600;
      color: #f8fafc;
      text-transform: lowercase;
    }

    .${PREFIX}-tab-index {
      background: #f59e0b;
      color: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .${PREFIX}-aria-label {
      color: #22c55e;
    }

    .${PREFIX}-item-selector,
    .${PREFIX}-history-selector,
    .${PREFIX}-issue-element {
      font-family: monospace;
      font-size: 11px;
      color: #64748b;
      overflow-wrap: break-word;
    }

    .${PREFIX}-trigger-keyboard { color: #3b82f6; }
    .${PREFIX}-trigger-mouse { color: #f59e0b; }
    .${PREFIX}-trigger-script { color: #a855f7; }

    .${PREFIX}-history-element {
      font-weight: 500;
      color: #e2e8f0;
    }

    .${PREFIX}-history-time {
      margin-left: auto;
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }

    .${PREFIX}-issue-error {
      border-color: #dc2626;
    }

    .${PREFIX}-issue-warning {
      border-color: #f59e0b;
    }

    .${PREFIX}-issue-info {
      border-color: #3b82f6;
    }

    .${PREFIX}-issue-icon {
      font-size: 14px;
    }

    .${PREFIX}-issue-type {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .${PREFIX}-issue-error .${PREFIX}-issue-type {
      background: #dc2626;
      color: white;
    }

    .${PREFIX}-issue-warning .${PREFIX}-issue-type {
      background: #f59e0b;
      color: #1e293b;
    }

    .${PREFIX}-issue-info .${PREFIX}-issue-type {
      background: #3b82f6;
      color: white;
    }

    .${PREFIX}-issue-message {
      margin-top: 4px;
      color: #e2e8f0;
    }

    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      font-size: 11px;
      color: #64748b;
    }

    /* Scrollbar */
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

export const focusDebugger = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  clearHistory,
};
