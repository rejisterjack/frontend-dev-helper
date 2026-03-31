# API Reference

This reference documents the internal APIs used by FrontendDevHelper.

::: warning
These APIs are internal and subject to change. They are documented for contributors and advanced users only.
:::

## Content Script API

Tools in the content script expose a standard interface:

```typescript
interface ToolAPI {
  enable: () => void;
  disable: () => void;
  toggle: () => boolean;
  getState: () => { isActive: boolean };
}
```

## Message Passing

Communication between popup and content script uses Chrome's message API:

```typescript
// Send message from popup
chrome.tabs.sendMessage(tabId, {
  type: 'DOM_OUTLINER_TOGGLE'
});

// Handle in content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOM_OUTLINER_TOGGLE') {
    const result = domOutliner.toggle();
    sendResponse(result);
  }
});
```

## Storage Schema

### Feature Toggles

```typescript
interface FeatureToggles {
  domOutliner: boolean;
  cssInspector: boolean;
  gridOverlay: boolean;
  // ... all 35 tools
}
```

### Tool Settings

```typescript
interface ToolSettings {
  domOutliner: {
    showTags: boolean;
    showClasses: boolean;
  };
  // ... per-tool settings
}
```

## TypeScript Types

All types are exported from `src/types/`:

```typescript
import type { ToolId, ToolSettings, FeatureToggles } from '@/types';
```
