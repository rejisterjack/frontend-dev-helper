# FrontendDevHelper API Documentation

## Overview

FrontendDevHelper uses a message-passing architecture for communication between background service worker, content scripts, and popup.

## Message Types

### Tool Actions

All tools support these standard message types:

| Message Type | Description | Request | Response |
|--------------|-------------|---------|----------|
| `{TOOL}_ENABLE` | Enable the tool | `{}` | `{ success: boolean, active: boolean }` |
| `{TOOL}_DISABLE` | Disable the tool | `{}` | `{ success: boolean, active: boolean }` |
| `{TOOL}_TOGGLE` | Toggle tool state | `{}` | `{ success: boolean, active: boolean }` |
| `{TOOL}_GET_STATE` | Get current state | `{}` | `{ success: boolean, state: ToolState }` |

### Available Tools

- `PESTICIDE` - DOM Outliner
- `DOM_OUTLINER` - Enhanced DOM highlighting
- `CSS_INSPECTOR` - CSS inspection tool
- `COLOR_PICKER` - Color picker and palette analyzer
- `FONT_INSPECTOR` - Font detection and inspection
- `RULER` - Screen ruler
- `MEASURE_TOOL` - Distance measurement
- `GRID_OVERLAY` - Grid overlay for alignment
- `RESPONSIVE_TESTER` - Responsive design testing
- `BREAKPOINT_ANALYZER` - Breakpoint detection
- `PERFORMANCE_MONITOR` - Performance metrics
- `NETWORK_ANALYZER` - Network request inspection
- `CONSOLE_PLUS` - Enhanced console
- `STORAGE_INSPECTOR` - Local/Session storage viewer
- `COOKIE_MANAGER` - Cookie management
- `API_TESTER` - API testing interface
- `FORM_VALIDATOR` - Form validation helper
- `ACCESSIBILITY_CHECKER` - Accessibility auditing
- `SEO_ANALYZER` - SEO analysis
- `SCREENSHOT_TOOL` - Screenshot capture
- `DESIGN_MODE` - In-page design editing
- `WHAT_FONT` - Font identification
- `VISUAL_REGRESSION` - Visual regression testing
- `AI_SUGGESTIONS` - AI-powered suggestions

### System Messages

| Message Type | Description | Request | Response |
|--------------|-------------|---------|----------|
| `PING` | Health check | `{}` | `{ pong: true, timestamp: number }` |
| `GET_SETTINGS` | Get extension settings | `{}` | `Settings` |
| `UPDATE_SETTINGS` | Update settings | `{ settings: Partial<Settings> }` | `{ success: boolean }` |
| `GET_FEATURES` | Get feature flags | `{}` | `FeatureFlags` |
| `TOGGLE_FEATURE` | Toggle feature | `{ feature: string, enabled: boolean }` | `{ success: boolean }` |
| `SITE_REPORT_GENERATE` | Generate site report | `{ includePerformance?: boolean, ... }` | `{ success: boolean, report: SiteReport }` |
| `EXPORT_GENERATE_REPORT` | Export report | `{ format: 'json' \| 'html' \| 'pdf', data: unknown }` | `{ success: boolean, blob?: Blob }` |

## Usage Examples

### Enable a Tool

```typescript
import { sendMessageToBackground } from '@/utils/messaging';

const response = await chrome.runtime.sendMessage({
  type: 'PESTICIDE_ENABLE'
});

if (response.success) {
  console.log('Pesticide enabled:', response.active);
}
```

### Toggle Tool State

```typescript
const response = await chrome.runtime.sendMessage({
  type: 'PESTICIDE_TOGGLE'
});

console.log('New state:', response.active);
```

### Get Tool State

```typescript
const response = await chrome.runtime.sendMessage({
  type: 'PESTICIDE_GET_STATE'
});

console.log('Tool state:', response.state);
```

### Send to Active Tab

```typescript
import { sendMessageToActiveTab } from '@/utils/messaging';

const response = await sendMessageToActiveTab({
  type: 'COLOR_PICKER_ENABLE'
});
```

## React Hooks

### useToolState

Manage tool state in React components:

```typescript
import { useToolState } from '@/hooks/useToolState';

function ToolButton({ toolId }: { toolId: string }) {
  const { isEnabled, isLoading, error, enable, disable, toggle } = useToolState(toolId);

  return (
    <button onClick={toggle} disabled={isLoading}>
      {isEnabled ? 'Disable' : 'Enable'}
    </button>
  );
}
```

### useStorage

Access extension storage:

```typescript
import { useStorage } from '@/hooks/useStorage';

function SettingsComponent() {
  const [settings, setSettings] = useStorage('fdh_settings', DEFAULT_SETTINGS);

  return (
    <input
      value={settings.theme}
      onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
    />
  );
}
```

## Storage Schema

### Settings

```typescript
interface ExtensionSettings {
  version: string;
  theme: 'light' | 'dark' | 'system';
  defaultTools: string[];
  shortcuts: Record<string, string>;
  notifications: {
    enabled: boolean;
    onInstall: boolean;
    onUpdate: boolean;
  };
  privacy: {
    analyticsEnabled: boolean;
    shareUsageData: boolean;
  };
}
```

### Feature Flags

```typescript
interface FeatureFlags {
  experimentalTools: boolean;
  betaFeatures: boolean;
  devMode: boolean;
}
```

## Error Handling

All responses follow this format:

```typescript
interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Check `success` before accessing data:

```typescript
const response = await chrome.runtime.sendMessage({ type: 'SOME_ACTION' });

if (!response.success) {
  console.error('Action failed:', response.error);
  return;
}

// Use response.data
```

## Type Safety

Use the generated Zod schemas for runtime validation:

```typescript
import { messageSchema } from '@/schemas/messages';

const result = messageSchema.safeParse(incomingMessage);
if (!result.success) {
  console.error('Invalid message:', result.error);
  return;
}
```
