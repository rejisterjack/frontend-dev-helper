# Contributing to Frontend Dev Helper

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- Chrome or Firefox browser

### Installation

```bash
# Clone the repository
git clone https://github.com/rejisterjack/frontend-dev-helper.git
cd frontend-dev-helper

# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

### Load Extension in Browser

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` folder

**Firefox:**
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `.output/firefox-mv2/manifest.json`

## Project Structure

```
FDH-EXT/
├── components/
│   ├── command-palette/     # Command palette component
│   ├── layout/              # Shell components (popup, sidepanel, devtools)
│   ├── onboarding/          # First-run onboarding overlay
│   ├── panels/              # Dashboard, settings, AI chat, tool detail
│   ├── tools/               # ToolCard, ToolGrid components
│   └── ui/                  # shadcn/ui primitives (auto-generated)
├── content/                  # Content script overlays and managers
├── entrypoints/
│   ├── background.ts        # Service worker / message router
│   ├── content.ts           # Content script entry
│   ├── popup/               # Popup UI entry
│   ├── sidepanel/           # Side panel UI entry
│   ├── devtools-panel/      # DevTools panel UI entry
│   └── devtools-pane/       # DevTools pane (sidebar)
├── hooks/                    # Shared React hooks
├── lib/
│   ├── constants.ts         # App-wide constants
│   ├── messaging/           # Typed message passing
│   ├── telemetry.ts         # Opt-in analytics
│   ├── types.ts             # Shared TypeScript types
│   └── validators.ts        # Zod schemas
├── stores/                   # Zustand stores
│   ├── use-connection-store.ts
│   ├── use-settings-store.ts
│   ├── use-tools-store.ts
│   └── use-ui-store.ts
├── tools/                    # Tool definitions
│   ├── inspection/          # DOM inspection tools
│   ├── css/                 # CSS analysis tools
│   ├── performance/         # Performance profiling tools
│   ├── accessibility/       # A11y audit tools
│   ├── ai/                  # AI-powered tools
│   ├── utilities/           # Utility tools
│   ├── metadata.ts          # Tool metadata registry
│   ├── registry.ts          # Tool runtime registry
│   └── types.ts             # Tool type definitions
└── public/                   # Static assets (icons, etc.)
```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript settings
- Avoid `any` types -- use proper interfaces and types
- Use Zod schemas for runtime validation at boundaries

### UI Components

- **Always use shadcn/ui components** -- no raw HTML elements for UI primitives
- Install UI components exclusively via the shadcn CLI: `npx shadcn@latest add <component>`
- Use default shadcn variants and props -- do not customize component styles
- Use the `cn()` utility from `@/lib/utils` for conditional classes

### Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Files (utilities) | `kebab-case.ts` | `use-active-tab.ts` |
| Files (components) | `PascalCase.tsx` | `ToolCard.tsx` |
| Components | PascalCase | `DashboardView` |
| Functions | camelCase | `activateTool` |
| Constants | UPPER_SNAKE_CASE | `MAX_RECENT_TOOLS` |
| Types/Interfaces | PascalCase | `ToolMetadata` |

### Import Order

1. External dependencies (`react`, `zod`, etc.)
2. Internal absolute imports (`@/...`)
3. Relative imports (`./...`, `../...`)

## How to Add a New Tool

### 1. Create the Tool Definition

Create a new file in the appropriate category folder under `tools/`:

```typescript
// tools/inspection/my-new-tool.ts
import type { ToolDefinition } from '../types';

export const myNewTool: ToolDefinition = {
  id: 'my-new-tool',
  name: 'My New Tool',
  description: 'Description of what the tool does',
  category: 'inspection',
  icon: 'Search',
  configSchema: {
    // optional config fields
    myOption: { type: 'boolean', label: 'My Option', default: true },
  },
  run: (ctx, config) => {
    let disposed = false;

    // Tool logic here -- runs in content script context

    function cleanup() {
      if (disposed) return;
      disposed = true;
      // Clean up overlays, event listeners, timers
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
```

### 2. Register in Category Index

Add to `tools/<category>/index.ts`:

```typescript
export { myNewTool } from './my-new-tool';
```

### 3. Add Metadata

Add an entry to `tools/metadata.ts`:

```typescript
'my-new-tool': {
  id: 'my-new-tool',
  name: 'My New Tool',
  description: 'Description of what the tool does',
  category: 'inspection',
  icon: 'Search',
  loader: () => import('./inspection/my-new-tool'),
},
```

### 4. Update Types

Add the new `ToolId` to `lib/types.ts` and `lib/constants.ts`.

### 5. Verify

```bash
bun run build
```

## Testing Guidelines

### Running Tests

```bash
# Run tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage
```

### Writing Tests

- Place test files next to the source file: `my-module.test.ts`
- Use Vitest for all tests
- Use `@testing-library/react` for component tests
- Test tool cleanup functions to ensure no memory leaks
- Test store actions independently

### Example

```typescript
import { describe, it, expect } from 'vitest';
import { useUIStore } from '@/stores/use-ui-store';

describe('useUIStore', () => {
  it('should add a favorite tool', () => {
    const { addFavorite, favoriteToolIds } = useUIStore.getState();
    addFavorite('dom-outliner');
    expect(useUIStore.getState().favoriteToolIds).toContain('dom-outliner');
  });
});
```

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**
   - Follow code style guidelines above
   - Update documentation if needed

3. **Verify**
   ```bash
   bun run build
   bun run test
   ```

4. **Commit** using conventional commits:
   - `feat: add new color contrast checker`
   - `fix: resolve issue with overlay cleanup`
   - `docs: update README`

5. **Push and Create PR** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes

## Security Guidelines

- Never use `innerHTML` with user input
- Validate all message payloads with Zod at boundaries
- Clean up all DOM overlays, event listeners, and timers in tool cleanup functions
- Store API keys in `chrome.storage.local` (never in content scripts)
- Telemetry is opt-in only; never collect PII, page content, or URLs

## Architecture

```
Popup (React/shadcn)  <-->  Background (WXT)  <-->  Content Script
    |                        |                          |
 Zustand stores        Message Router            Tool Runner
 (tools, settings,     (typed messages)          (registry pattern)
  ui, connection)
```

- **Popup / Sidepanel / DevTools Panel**: React 19 + shadcn/ui, state managed by Zustand
- **Background**: WXT service worker handling message routing
- **Content Script**: Tool runner managing tool lifecycle via registry pattern
- **Tools**: Each tool is a `ToolDefinition` with `run(ctx, config) => cleanup`

## Questions?

- Check existing [issues](https://github.com/rejisterjack/frontend-dev-helper/issues) and [discussions](https://github.com/rejisterjack/frontend-dev-helper/discussions)
- Open a new issue for bugs or feature requests

Thank you for contributing!
