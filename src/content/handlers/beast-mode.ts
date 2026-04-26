/**
 * Beast Mode Handlers
 *
 * Handlers for lazily-loaded tool modules (container-query-inspector,
 * view-transitions-debugger, scroll-animations-debugger).
 * These use dynamic imports via beast-mode-loader so their code lands
 * in separate chunks until first used.
 */

import type { ContentHandler } from '@/types';
import {
  getContainerQueryInspector,
  getScrollAnimationsDebugger,
  getViewTransitionsDebugger,
} from '../beast-mode-loader';

// ---------------------------------------------------------------------------
// Container Query Inspector
// ---------------------------------------------------------------------------

const containerQueryInspectorHandlers: Record<string, ContentHandler> = {
  CONTAINER_QUERY_INSPECTOR_ENABLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.enable();
        state.isContainerQueryInspectorActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_DISABLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.disable();
        state.isContainerQueryInspectorActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_TOGGLE: (_payload, state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isContainerQueryInspectorActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_GET_STATE: (_payload, _state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  CONTAINER_QUERY_INSPECTOR_GET_SUMMARY: (_payload, _state, sendResponse) => {
    void getContainerQueryInspector()
      .then((m) => {
        const summary = m.getContainerSummary();
        sendResponse({ success: true, summary });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
};

// ---------------------------------------------------------------------------
// View Transitions Debugger
// ---------------------------------------------------------------------------

const viewTransitionsDebuggerHandlers: Record<string, ContentHandler> = {
  VIEW_TRANSITIONS_DEBUGGER_ENABLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.enable();
        state.isViewTransitionsDebuggerActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_DISABLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.disable();
        state.isViewTransitionsDebuggerActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_TOGGLE: (_payload, state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isViewTransitionsDebuggerActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  VIEW_TRANSITIONS_DEBUGGER_GET_STATE: (_payload, _state, sendResponse) => {
    void getViewTransitionsDebugger()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
};

// ---------------------------------------------------------------------------
// Scroll Animations Debugger
// ---------------------------------------------------------------------------

const scrollAnimationsDebuggerHandlers: Record<string, ContentHandler> = {
  SCROLL_ANIMATIONS_DEBUGGER_ENABLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.enable();
        state.isScrollAnimationsDebuggerActive = true;
        sendResponse({ success: true, active: true });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_DISABLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.disable();
        state.isScrollAnimationsDebuggerActive = false;
        sendResponse({ success: true, active: false });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_TOGGLE: (_payload, state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        m.toggle();
        const s = m.getState();
        state.isScrollAnimationsDebuggerActive = s.enabled;
        sendResponse({ success: true, active: s.enabled });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_GET_STATE: (_payload, _state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        sendResponse({ success: true, state: m.getState() });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
  SCROLL_ANIMATIONS_DEBUGGER_GET_SUMMARY: (_payload, _state, sendResponse) => {
    void getScrollAnimationsDebugger()
      .then((m) => {
        const summary = m.getAnimationSummary();
        sendResponse({ success: true, summary });
      })
      .catch((e) => sendResponse({ success: false, error: String(e) }));
    return true;
  },
};

/** Combined export for all beast-mode handlers */
export const beastModeHandlers: Record<string, ContentHandler> = {
  ...containerQueryInspectorHandlers,
  ...viewTransitionsDebuggerHandlers,
  ...scrollAnimationsDebuggerHandlers,
};
