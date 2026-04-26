# FrontendDevHelper Architecture

This document describes the architecture of the FrontendDevHelper browser extension, including the communication model between different components.

## Overview

FrontendDevHelper is a browser extension built with:
- **Manifest V3** — Modern extension format for Chrome/Firefox/Brave
- **React 18** — UI framework for popup and options pages
- **TypeScript** — Type-safe JavaScript
- **Vite** — Build tool with CRXJS plugin for extension support
- **33+ debugging tools** organized across inspection, CSS, responsive, performance, AI, and utility categories
- **Monetization system** — Stripe-backed license server with Free/Pro/Team tiers
- **Beast Mode loader** — Lazy-loaded tool chunks to keep initial payload small

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER EXTENSION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐         ┌─────────────────────┐                    │
│  │   Service Worker    │◄───────►│   Content Script    │                    │
│  │  (Background Script)│         │   (Page Context)    │                    │
│  │                     │         │                     │                    │
│  │ • Lifecycle mgmt    │         │ • DOM manipulation  │                    │
│  │ • Message routing   │         │ • Tool execution    │                    │
│  │ • Storage sync      │         │ • Event handling    │                    │
│  │ • Context menus     │         │ • State tracking    │                    │
│  └──────────┬──────────┘         └──────────▲──────────┘                    │
│             │                               │                                │
│             │    chrome.runtime API         │                                │
│             │    chrome.tabs API            │                                │
│             │                               │                                │
│  ┌──────────▼──────────┐         ┌──────────┴──────────┐                    │
│  │      Popup UI       │         │   Web Page (Host)   │                    │
│  │                     │         │                     │                    │
│  │ • React components  │         │ • User's website    │                    │
│  │ • Tool toggles      │         │ • Inspected DOM     │                    │
│  │ • Settings panel    │         │ • Injected overlays │                    │
│  └─────────────────────┘         └─────────────────────┘                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Shared Utilities                                 │ │
│  │  • Messaging (src/utils/messaging.ts)                                   │ │
│  │  • Storage (src/utils/storage.ts)                                       │ │
│  │  • Constants (src/constants/index.ts)                                   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Service Worker (Background Script)

**Location**: `src/background/service-worker.ts`

The service worker is the central coordinator of the extension:

- **Installation & Updates**: Handles extension lifecycle events
- **Message Routing**: Routes messages between popup and content scripts
- **Storage Management**: Persists tool states and user settings
- **Context Menus**: Creates and manages right-click menu items
- **Keyboard Shortcuts**: Handles global keyboard commands
- **Badge Updates**: Updates the extension icon badge with active tool count

**Key Exports**:
```typescript
// Main initialization happens automatically on import
export {
  getActiveToolIds,
  handleCommand,
  state,
  toggleToolOnTab,
  updateBadge,
};
```

### Content Script

**Location**: `src/content/index.ts`

Content scripts run in the context of web pages and have access to the DOM:

- **Tool Execution**: Activates/deactivates debugging tools on the page
- **DOM Manipulation**: Injects visual overlays, highlights, etc.
- **Message Handling**: Listens for commands from the service worker
- **State Tracking**: Maintains per-tab tool state

**Message Handling Pattern**:
```typescript
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case MESSAGE_TYPES.TOGGLE_TOOL:
      // Handle tool toggle
      break;
    // ... more cases
  }
  return true; // Async response
});
```

### Popup UI

**Location**: `src/popup/` (React components)

The popup is the main user interface:

- **Tool Toggles**: Enable/disable individual tools
- **Settings**: Configure tool behavior
- **Status Display**: Show active tools and quick stats

### Options Page

**Location**: `src/options/`

The options page provides detailed settings:

- **Global Settings**: Extension-wide configuration
- **Tool Settings**: Per-tool customization
- **Keyboard Shortcuts**: Custom shortcut configuration
- **Welcome/Onboarding**: First-time user experience

## Communication Model

### Message Types

All communication uses the standardized `MESSAGE_TYPES` constant from `src/constants/index.ts`:

```typescript
export const MESSAGE_TYPES = {
  // Tool management
  TOGGLE_TOOL: 'TOGGLE_TOOL',
  GET_TOOL_STATE: 'GET_TOOL_STATE',
  SET_TOOL_STATE: 'SET_TOOL_STATE',
  GET_ALL_TOOL_STATES: 'GET_ALL_TOOL_STATES',
  
  // Tab management
  TAB_CHANGED: 'TAB_CHANGED',
  URL_CHANGED: 'URL_CHANGED',
  INIT: 'INIT',
  
  // Settings
  GET_SETTINGS: 'GET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  
  // Ping/Connectivity
  PING: 'PING',
  PONG: 'PONG',
  
  // ... and more
} as const;
```

**Note**: The old `MessageType` enum in `src/types/messages.ts` is deprecated. Use `MESSAGE_TYPES` from constants instead.

### Communication Flow Examples

#### 1. Tool Toggle Flow

```
User clicks toggle in Popup
        │
        ▼
Popup sends TOGGLE_TOOL message to Service Worker
        │
        ▼
Service Worker updates storage
        │
        ▼
Service Worker broadcasts TOOL_STATE_CHANGED to all contexts
        │
        ├──────────► Content Script receives message
        │                    │
        │                    ▼
        │            Content Script activates tool in DOM
        │                    │
        │                    ▼
        │            Content Script sends acknowledgment
        │
        ▼
Service Worker updates badge count
```

#### 2. Context Menu Flow

```
User right-clicks on page
        │
        ▼
Chrome shows FrontendDevHelper context menu
        │
        ▼
User selects menu item
        │
        ▼
Service Worker receives contextMenus.onClicked event
        │
        ▼
Service Worker sends message to Content Script
        │
        ▼
Content Script activates corresponding tool
```

### Message Utilities

**Location**: `src/utils/messaging.ts`

Helper functions for sending messages:

```typescript
// Send to specific tab
await sendMessageToTab(tabId, createToggleToolMessage(toolId, true));

// Send to active tab
await sendMessageToActiveTab(createPingMessage());

// Send to all tabs
await sendMessageToAllTabs(message, (tab) => tab.url?.startsWith('https'));

// Broadcast to all extension contexts
await broadcastMessage(message);

// Send to background
await sendMessageToBackground(createGetSettingsMessage());
```

## Storage Architecture

**Location**: `src/utils/storage.ts`

### Storage Schema

```typescript
{
  fdh_settings: {
    version: string;
    theme: 'dark' | 'light';
    tools: Record<ToolId, ToolState>;
    // ... other settings
  },
  
  fdh_tool_states: {
    global: Record<ToolId, ToolState>,  // Global tool states
    tabs: {
      [tabId: number]: Record<ToolId, ToolState>  // Per-tab states
    }
  },
  
  fdh_storage_version: string  // For migration tracking
}
```

### Storage Keys

All storage keys are defined in `src/constants/index.ts`:

```typescript
export const STORAGE_KEYS = {
  SETTINGS: 'fdh_settings',
  TOOL_STATES: 'fdh_tool_states',
  TAB_STATES: 'fdh_tab_states',
  // ... etc
} as const;
```

## Tool Architecture

FrontendDevHelper ships **33+ tools** across six categories. Each tool follows a consistent pattern:

### Tool Categories

| Category | Tools |
|----------|-------|
| **Inspection** | DOM Outliner, Spacing Visualizer, Font Inspector, Color Picker, Pixel Ruler, Element Inspector, Component Tree, Smart Element Picker |
| **CSS** | CSS Inspector, CSS Editor, Contrast Checker, CSS Scanner, CSS Variable Inspector, Design System Validator |
| **Responsive** | Breakpoint Overlay, Responsive Preview, Container Query Inspector |
| **Performance** | Network Analyzer, Flame Graph, Performance Budget, Site Report, Session Recorder |
| **AI / Smart** | Smart Suggestions, Command Palette, Framework DevTools |
| **Utility** | Screenshot Studio, Animation Inspector, Storage Inspector, Focus Debugger, Form Debugger, Visual Regression, View Transitions Debugger, Scroll Animations Debugger, Tech Detector, Layout Visualizer, Z-Index Visualizer, Grid Overlay, Measurement Tool |

### Tool Structure

```typescript
// src/content/[tool-name].ts

interface ToolState {
  enabled: boolean;
  // tool-specific state
}

const state: ToolState = {
  enabled: false,
  // ...
};

export const toolName = {
  enable() {
    state.enabled = true;
    // Inject DOM elements, add listeners
  },

  disable() {
    state.enabled = false;
    // Cleanup DOM, remove listeners
  },

  toggle() {
    if (state.enabled) {
      this.disable();
    } else {
      this.enable();
    }
  },

  getState() {
    return { ...state };
  },
};
```

### Beast Mode Loader

**Location**: `src/content/beast-mode-loader.ts`

Beast Mode tools (Container Query Inspector, View Transitions Debugger, Scroll Animations Debugger) are **lazy-loaded** via dynamic `import()` so their code lands in separate chunks until first activated. This keeps the initial content-script bundle small. The loader caches each module promise and nullifies it on failure so the next attempt retries.

```typescript
export function getContainerQueryInspector(): Promise<typeof import('./container-query-inspector')> {
  if (!cqiPromise) {
    cqiPromise = import('./container-query-inspector').catch((err) => {
      cqiPromise = null;
      throw err;
    });
  }
  return cqiPromise;
}
```

### Tool Registration

Tools are registered in:
1. `src/constants/index.ts` — `TOOL_IDS` and `TOOL_METADATA`
2. `src/content/handlers/index.ts` — Central handler registry with `createToolHandlers()` helper
3. `src/utils/tool-catalog.ts` — Catalog for command palette, onboarding, and progressive disclosure

### Handler Registry

**Location**: `src/content/handlers/index.ts`

All content-script message handlers are centralized in a single `registry` object. Eagerly loaded tools use `createToolHandlers()` to auto-generate `ENABLE/DISABLE/TOGGLE/GET_STATE` handlers. Beast Mode tools register explicit async handlers that load their module via the beast-mode loader before delegating.

## React Hooks

### useToolState

**Location**: `src/hooks/useToolState.ts`

Manages state for a single tool:

```typescript
function MyComponent() {
  const { state, toggle, updateSettings } = useToolState(TOOL_IDS.DOM_OUTLINER);
  
  return (
    <button onClick={toggle}>
      {state.enabled ? 'Disable' : 'Enable'} DOM Outliner
    </button>
  );
}
```

### useAllToolStates

Manages state for all tools:

```typescript
function Toolbar() {
  const { states, toggleTool, disableAll } = useAllToolStates();
  
  return (
    <div>
      {Object.entries(states).map(([toolId, state]) => (
        <button key={toolId} onClick={() => toggleTool(toolId as ToolId)}>
          {toolId}: {state.enabled ? 'ON' : 'OFF'}
        </button>
      ))}
      <button onClick={disableAll}>Disable All</button>
    </div>
  );
}
```

## Security Considerations

1. **Content Security Policy**: Defined in manifest.json
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self'"
   }
   ```
   See `docs/SECURITY.md` for the full security model.

2. **Input sanitization**: All dynamic content is escaped with `escapeHtml()`, `sanitizeColor()`, and `sanitizeUrl()` from `src/utils/sanitize.ts`.

3. **Host Permissions**: `<all_urls>` is justified for a dev tool that needs to inspect any page.

4. **Data Collection**: Zero — no user data is collected or transmitted.

## Monetization Architecture

**Location**: `monetization/`

A Stripe-backed licensing system gates premium features behind Free/Pro/Team tiers.

```
Extension (Client)  <-->  License Server (Node.js/Express)  <-->  Stripe (Payments)
                                       |
                                  Webhooks (signature-verified)
```

### Components

| Component | Location | Role |
|-----------|----------|------|
| License Server | `monetization/server/` | Express API with JWT validation, Stripe webhooks, team management |
| Stripe Integration | `monetization/server/src/routes/webhooks.ts` | Checkout sessions, subscription events, customer portal |
| Extension Client | `src/background/licensing.ts` | Feature gating, license key storage, periodic validation |
| Notifications | `monetization/server/src/utils/notifyUser.ts` | Transactional email via Resend for payment and trial events |

### Security measures
- Stripe webhook signature verification on every incoming event
- Cryptographic license key generation (`crypto.randomBytes`)
- Zod schema validation for all webhook metadata payloads
- Environment variable validation on startup

## Performance Optimizations

1. **AI Analyzer Sampling**: For large DOMs (>1000 nodes), samples elements instead of checking all
2. **Lazy Loading (Beast Mode)**: Beast Mode tools are loaded on-demand via dynamic `import()` chunks (see beast-mode-loader.ts)
3. **Debouncing**: Resize and scroll events are debounced
4. **Storage Caching**: Tool states are cached in memory to reduce storage reads
5. **Timer Management**: `TimerManager` from `src/utils/timer-manager` centralizes setTimeout/setInterval and guarantees cleanup on tool disable

## Error Handling

Components are wrapped in Error Boundaries to prevent crashes from taking down the entire UI:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <AISuggestions />
</ErrorBoundary>
```

## Testing

- **Unit Tests**: `tests/unit/` - Jest/Vitest for utilities and hooks
- **E2E Tests**: `tests/e2e/` - Playwright for extension flow testing
- **Coverage Target**: 80%+ lines/functions/statements, 75%+ branches

## Build & Development

```bash
# Development
pnpm dev          # Start Vite dev server with HMR

# Build
pnpm build        # Production build

# Test
pnpm test         # Run unit tests
pnpm test:e2e     # Run E2E tests
pnpm coverage     # Generate coverage report

# Lint
pnpm lint         # Run Biome linter
```

## Third-party plugin surface

There is **no supported third-party plugin SDK** for end users. Code under `src/plugins/` is experimental and is not wired to the manifest, options page, or background worker. Treat it as internal scaffolding unless a future release documents a supported integration path.

## Migration Notes

### From MessageType enum to MESSAGE_TYPES constant

**Old (deprecated)**:
```typescript
import { MessageType } from '@/types/messages';

type: MessageType.TOGGLE_TOOL
```

**New**:
```typescript
import { MESSAGE_TYPES } from '@/constants';

type: MESSAGE_TYPES.TOGGLE_TOOL
```

---

*Last updated: 2026-04-26*
