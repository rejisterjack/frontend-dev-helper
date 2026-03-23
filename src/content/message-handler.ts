/**
 * Content Script Message Handler
 *
 * @deprecated This class is no longer used. Message handling is done via the
 * handler registry at `src/content/handlers/index.ts`, which is registered
 * in `src/content/index.ts`. This file is kept only to avoid breaking
 * the test at `tests/content/message-handler.test.ts` while it is migrated.
 *
 * Do NOT add new code here. Route new message types through the registry instead.
 */

import type { ExtensionMessage, MessageResponse } from '@/types';
import { logger } from '@/utils/logger';

interface ElementInspector {
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}

interface FeatureManager {
  getFeatures: () => Record<string, unknown>;
  enableFeature: (feature: string) => void;
  disableFeature: (feature: string) => void;
  disableAll: () => void;
}

interface HandlerDependencies {
  featureManager: FeatureManager;
  elementInspector: ElementInspector;
}

/** @deprecated Use src/content/handlers/index.ts registry instead. */
export class MessageHandler {
  private deps: HandlerDependencies;

  constructor(dependencies: HandlerDependencies) {
    this.deps = dependencies;
  }

  initialize(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    logger.info('[MessageHandler] Message handling initialized (deprecated — use registry)');
  }

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
          sendResponse({ success: true, data: { initialized: true }, id: message.id });
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
          sendResponse({ success: true, id: message.id });
          break;

        case 'GET_FEATURES':
          sendResponse({
            success: true,
            data: this.deps.featureManager.getFeatures(),
            id: message.id,
          });
          break;

        case 'INSPECT_ELEMENT':
          this.deps.elementInspector.activate();
          sendResponse({ success: true, id: message.id });
          break;

        case 'DISPOSE':
          this.deps.featureManager.disableAll();
          sendResponse({ success: true, id: message.id });
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

  private async handleToggleFeature(message: ExtensionMessage): Promise<void> {
    const { feature, enabled } = message.payload as { feature: string; enabled: boolean };
    if (feature === 'elementInspector') {
      if (enabled) {
        this.deps.elementInspector.activate();
      } else {
        this.deps.elementInspector.deactivate();
      }
    } else {
      if (enabled) {
        this.deps.featureManager.enableFeature(feature);
      } else {
        this.deps.featureManager.disableFeature(feature);
      }
    }
  }
}
