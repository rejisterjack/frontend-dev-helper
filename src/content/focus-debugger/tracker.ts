/**
 * Focus Debugger Tracker
 *
 * Focus tracking logic for the focus debugger module.
 */

import type { FocusableElement, FocusHistoryEntry } from '@/types';
import { logger } from '@/utils/logger';
import { FOCUS_HISTORY_LIMIT, FOCUSABLE_SELECTORS, PREFIX } from './constants';
import type { FocusTrigger } from './types';

export class FocusTracker {
  focusableElements: FocusableElement[] = [];
  focusHistory: FocusHistoryEntry[] = [];
  currentFocusedElement: HTMLElement | null = null;
  trapElements: HTMLElement[] = [];
  lastKeyboardFocusTime = 0;

  private onFocusChange?: (element: HTMLElement, trigger: FocusTrigger) => void;
  private onHistoryUpdate?: () => void;

  constructor(
    onFocusChange?: (element: HTMLElement, trigger: FocusTrigger) => void,
    onHistoryUpdate?: () => void
  ) {
    this.onFocusChange = onFocusChange;
    this.onHistoryUpdate = onHistoryUpdate;
  }

  scanFocusableElements(): void {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

    this.focusableElements = elements
      .filter((el) => this.isElementVisible(el) && !this.isElementDisabled(el))
      .map((el, index) => ({
        element: el,
        selector: this.generateSelector(el),
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

  isElementVisible(element: HTMLElement): boolean {
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

  isElementDisabled(element: HTMLElement): boolean {
    return element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
  }

  generateSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }

    const tagName = element.tagName.toLowerCase();
    const classes = Array.from(element.classList)
      .filter((c) => !c.startsWith(`${PREFIX.split('-')[0]}-`))
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

  detectFocusTraps(): void {
    this.trapElements = [];

    // Check for elements with positive tabIndex (can create tab traps)
    const positiveTabIndex = this.focusableElements.filter((el) => el.tabIndex > 0);
    if (positiveTabIndex.length > 1) {
      // Multiple positive tab indices can create confusing navigation
      logger.warn('[FocusDebugger] Multiple positive tab indices found:', positiveTabIndex);
    }

    // Check for hidden/disabled elements in tab order
    this.focusableElements.forEach((el) => {
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
          this.trapElements.push(element);
        }
      }

      // Check for position fixed/sticky that might overlay content
      if (style.position === 'fixed' || style.position === 'sticky') {
        const rect = element.getBoundingClientRect();
        if (rect.width > window.innerWidth * 0.8 && rect.height > window.innerHeight * 0.8) {
          // Large overlay that might trap focus
          this.trapElements.push(element);
        }
      }
    });

    // Remove duplicates
    this.trapElements = [...new Set(this.trapElements)];
  }

  handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    this.currentFocusedElement = target;

    // Determine trigger type
    let trigger: FocusTrigger = 'script';
    if (Date.now() - this.lastKeyboardFocusTime < 100) {
      trigger = 'keyboard';
    } else if (event.relatedTarget === null && document.hasFocus()) {
      trigger = 'mouse';
    }

    // Add to history
    this.addToHistory(target, trigger);

    // Notify callback
    this.onFocusChange?.(target, trigger);
  }

  handleFocusOut(_event: FocusEvent): void {
    // Could track focus leaving elements
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.lastKeyboardFocusTime = Date.now();
    }
  }

  handleMouseDown(): void {
    // Reset keyboard focus time on mouse interaction
    this.lastKeyboardFocusTime = 0;
  }

  addToHistory(element: HTMLElement, trigger: FocusTrigger): void {
    const entry: FocusHistoryEntry = {
      timestamp: Date.now(),
      element: element.tagName.toLowerCase(),
      selector: this.generateSelector(element),
      trigger,
    };

    this.focusHistory.unshift(entry);

    // Limit history size
    if (this.focusHistory.length > FOCUS_HISTORY_LIMIT) {
      this.focusHistory = this.focusHistory.slice(0, FOCUS_HISTORY_LIMIT);
    }

    // Notify callback
    this.onHistoryUpdate?.();
  }

  clearHistory(): void {
    this.focusHistory = [];
    this.onHistoryUpdate?.();
    logger.log('[FocusDebugger] History cleared');
  }

  isFocusableElement(element: HTMLElement): boolean {
    return element.matches?.(FOCUSABLE_SELECTORS) || false;
  }

  getCurrentTabOrder(): number | undefined {
    if (!this.currentFocusedElement) return undefined;
    const found = this.focusableElements.find((el) => el.element === this.currentFocusedElement);
    return found?.tabOrder;
  }

  reset(): void {
    this.focusableElements = [];
    this.focusHistory = [];
    this.currentFocusedElement = null;
    this.trapElements = [];
    this.lastKeyboardFocusTime = 0;
  }
}
