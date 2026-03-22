/**
 * Content Script Message Handler
 *
 * Processes messages from the background script and popup.
 */

import type { ExtensionMessage, MessageResponse } from '@/types';
import { logger } from '@/utils/logger';

interface HandlerDependencies {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featureManager: import('./feature-manager').FeatureManager;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elementInspector: any;
}

export class MessageHandler {
  private deps: HandlerDependencies;

  constructor(dependencies: HandlerDependencies) {
    this.deps = dependencies;
  }

  /**
   * Initialize message handling
   */
  initialize(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Async response
    });

    logger.info('[MessageHandler] Message handling initialized');
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    try {
      logger.info('[MessageHandler] Received:', message.type);

      switch (message.type) {
        case 'PING':
          sendResponse({
            success: true,
            data: { pong: true, timestamp: Date.now() },
            id: message.id,
          });
          break;

        case 'INIT':
          sendResponse({
            success: true,
            data: { initialized: true },
            id: message.id,
          });
          break;

        case 'GET_SETTINGS':
          sendResponse({
            success: true,
            data: (window as { __FRONTEND_DEV_HELPER__?: { settings?: unknown } })
              .__FRONTEND_DEV_HELPER__?.settings,
            id: message.id,
          });
          break;

        case 'TOGGLE_FEATURE':
          await this.handleToggleFeature(message);
          sendResponse({
            success: true,
            id: message.id,
          });
          break;

        case 'GET_FEATURES':
          sendResponse({
            success: true,
            data: this.deps.featureManager.getFeatures(),
            id: message.id,
          });
          break;

        case 'INSPECT_ELEMENT':
          this.handleInspectElement();
          sendResponse({
            success: true,
            id: message.id,
          });
          break;

        case 'CLEAR_SELECTION':
          this.deps.elementInspector.clearSelection();
          sendResponse({
            success: true,
            id: message.id,
          });
          break;

        case 'GET_ELEMENT_INFO': {
          const element = this.deps.elementInspector.getSelectedElement();
          sendResponse({
            success: true,
            data: element ? this.extractElementData(element) : null,
            id: message.id,
          });
          break;
        }

        case 'GET_COMPUTED_STYLES': {
          const styles = this.getComputedStylesForElement(
            (message.payload as { selector?: string })?.selector ?? ''
          );
          sendResponse({
            success: true,
            data: styles,
            id: message.id,
          });
          break;
        }

        case 'COPY_CSS': {
          const css = this.generateCSS((message.payload as { selector?: string })?.selector ?? '');
          await this.copyToClipboard(css);
          sendResponse({
            success: true,
            data: { copied: true },
            id: message.id,
          });
          break;
        }

        case 'TAKE_SCREENSHOT':
          // Screenshot is handled by background script using chrome.tabs.captureVisibleTab
          sendResponse({
            success: true,
            id: message.id,
          });
          break;

        case 'DISPOSE':
          this.deps.featureManager.disableAll();
          sendResponse({
            success: true,
            id: message.id,
          });
          break;

        default:
          sendResponse({
            success: false,
            error: `Unknown message type: ${message.type}`,
            id: message.id,
          });
      }
    } catch (error) {
      logger.error('[MessageHandler] Error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        id: message.id,
      });
    }
  }

  /**
   * Handle feature toggle
   */
  private async handleToggleFeature(message: ExtensionMessage): Promise<void> {
    const { feature, enabled } = message.payload as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feature: any;
      enabled: boolean;
    };

    if (feature === 'elementInspector') {
      if (enabled) {
        this.deps.elementInspector.activate();
      } else {
        this.deps.elementInspector.deactivate();
      }
    } else {
      if (enabled) {
        (this.deps.featureManager.enableFeature as (f: string) => void)(feature as string);
      } else {
        (this.deps.featureManager.disableFeature as (f: string) => void)(feature as string);
      }
    }
  }

  /**
   * Start element inspection
   */
  private handleInspectElement(): void {
    this.deps.elementInspector.activate();
  }

  /**
   * Extract element data for message response
   */
  private extractElementData(element: HTMLElement): Record<string, unknown> {
    const rect = element.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(element);

    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      classes: Array.from(element.classList),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      styles: {
        display: computedStyle.display,
        position: computedStyle.position,
        width: computedStyle.width,
        height: computedStyle.height,
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
      },
    };
  }

  /**
   * Get computed styles for an element
   */
  private getComputedStylesForElement(selector: string): Record<string, string> | null {
    try {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (!element) return null;

      const computed = window.getComputedStyle(element);
      const styles: Record<string, string> = {};

      // Get commonly used properties
      const properties = [
        'display',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'width',
        'height',
        'margin',
        'padding',
        'border',
        'background',
        'color',
        'font',
        'line-height',
        'text-align',
        'z-index',
        'opacity',
        'transform',
        'transition',
        'animation',
      ];

      for (const prop of properties) {
        styles[prop] = computed.getPropertyValue(prop);
      }

      return styles;
    } catch (error) {
      logger.error('[MessageHandler] Failed to get computed styles:', error);
      return null;
    }
  }

  /**
   * Generate CSS for an element
   */
  private generateCSS(selector: string): string {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) return '';

    const computed = window.getComputedStyle(element);
    let css = `${selector} {\n`;

    for (let i = 0; i < computed.length; i++) {
      const prop = computed[i];
      const value = computed.getPropertyValue(prop);

      // Skip default/initial values
      if (value && value !== 'initial' && value !== 'auto') {
        css += `  ${prop}: ${value};\n`;
      }
    }

    css += '}';
    return css;
  }

  /**
   * Copy text to clipboard
   */
  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      logger.error('[MessageHandler] Failed to copy to clipboard:', error);
      throw error;
    }
  }
}
