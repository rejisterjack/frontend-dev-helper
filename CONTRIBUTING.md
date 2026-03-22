# Contributing to FrontendDevHelper

Thank you for your interest in contributing to FrontendDevHelper! This document provides guidelines for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+ (preferred package manager)
- Chrome or Firefox browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/frontend-dev-helper.git
cd frontend-dev-helper

# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test -- --watch
```

### Load Extension in Browser

**Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

**Firefox:**
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `dist/manifest.json`

## Code Style Guidelines

### TypeScript

- Use strict TypeScript settings
- Avoid `any` types - use proper interfaces
- Use Zod schemas for runtime validation
- Add JSDoc comments for public APIs

### Code Formatting

We use Biome for linting and formatting:

```bash
# Check formatting and linting
pnpm run lint

# Auto-fix issues
pnpm run lint:fix

# Format code
pnpm run format
```

### Naming Conventions

- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Components**: PascalCase (`Button.tsx`, `DevToolsPanel.tsx`)
- **Functions**: camelCase (`sendMessage`, `calculateDiff`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`, `MESSAGE_TYPES`)
- **Interfaces**: PascalCase with descriptive names (`MessageHandler`, `ToolState`)
- **Types**: PascalCase with `Type` suffix (optional) (`ExtensionMessageType`)

### Import Order

1. External dependencies (react, zod, etc.)
2. Internal absolute imports (`@/utils/...`, `@/types/...`)
3. Relative imports (`./...`, `../...`)

Example:
```typescript
import { useState, useCallback } from 'react';
import { z } from 'zod';

import { logger } from '@/utils/logger';
import type { ToolState } from '@/types';

import { ToolButton } from './ToolButton';
```

## Adding New Tools

To add a new tool to FrontendDevHelper:

### 1. Create Tool Module

Create a new file in `src/content/`:

```typescript
// src/content/my-new-tool.ts
import { logger } from '@/utils/logger';

let isEnabled = false;
let panelContainer: HTMLElement | null = null;

export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;
  createPanel();
  logger.log('[MyNewTool] Enabled');
}

export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;
  destroyPanel();
  logger.log('[MyNewTool] Disabled');
}

export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

export function getState(): { enabled: boolean } {
  return { enabled: isEnabled };
}

function createPanel(): void {
  // Create your UI here
}

function destroyPanel(): void {
  // Cleanup your UI here
}
```

### 2. Register Handlers

Add to `src/content/handlers/index.ts`:

```typescript
import * as myNewTool from '../my-new-tool';

export const registry: Record<string, ContentHandler> = {
  // ... existing handlers
  ...createToolHandlers('MY_NEW_TOOL', myNewTool, 'myNewToolEnabled'),
};
```

### 3. Update Types

Add state key to `ContentScriptState` in `src/types/index.ts`:

```typescript
export interface ContentScriptState {
  // ... existing properties
  myNewToolEnabled: boolean;
}
```

### 4. Add Tests

Create test file in `tests/content/my-new-tool.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as myNewTool from '@/content/my-new-tool';

describe('MyNewTool', () => {
  beforeEach(() => {
    myNewTool.disable();
  });

  it('should start disabled', () => {
    expect(myNewTool.getState().enabled).toBe(false);
  });

  it('should enable tool', () => {
    myNewTool.enable();
    expect(myNewTool.getState().enabled).toBe(true);
  });
});
```

### 5. Add UI (Optional)

If your tool needs popup UI, add to `src/popup/tabs/`:

```typescript
// src/popup/tabs/MyNewToolTab.tsx
import { useToolState } from '@/hooks/useToolState';

export function MyNewToolTab(): React.ReactElement {
  const { isEnabled, toggle } = useToolState('myNewTool');

  return (
    <div>
      <h2>My New Tool</h2>
      <button onClick={toggle}>
        {isEnabled ? 'Disable' : 'Enable'}
      </button>
    </div>
  );
}
```

## Testing Requirements

### Coverage Thresholds

- Lines: 80%
- Functions: 80%
- Branches: 75%
- Statements: 80%

### Test Types

1. **Unit Tests**: Test individual functions and modules
2. **Component Tests**: Test React components with React Testing Library
3. **Integration Tests**: Test interaction between modules

### Running Tests

```bash
# Run all tests
pnpm run test

# Run with coverage
pnpm run test:coverage

# Run specific file
pnpm run test -- tests/unit/message-router.test.ts

# Run in watch mode
pnpm run test -- --watch
```

### Test Best Practices

- Use descriptive test names
- Test both success and error cases
- Mock external dependencies
- Clean up after each test

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/my-bugfix
   ```

2. **Make Changes**
   - Write code following style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Run Checks**
   ```bash
   pnpm run lint
   pnpm run test
   pnpm run build
   ```

4. **Commit Changes**
   - Use conventional commits format
   - Examples:
     - `feat: add new color contrast checker`
     - `fix: resolve XSS vulnerability in color picker`
     - `docs: update API documentation`
     - `test: add tests for message router`

5. **Push and Create PR**
   ```bash
   git push origin feature/my-feature
   ```
   Then create a PR on GitHub with:
   - Clear description of changes
   - Link to related issues
   - Screenshots if UI changes

6. **Code Review**
   - Address review comments
   - Keep PRs focused and small
   - Rebase if needed

## Security Guidelines

- Never use `innerHTML` with user input
- Use event delegation instead of inline handlers
- Validate all JSON inputs with Zod schemas
- Use proper CSP-compliant code
- Sanitize any DOM manipulations

## Performance Guidelines

- Use Web Workers for heavy computations
- Implement virtual scrolling for long lists
- Use `requestAnimationFrame` for animations
- Lazy load heavy components
- Monitor bundle size with `pnpm run size`

## Questions?

- Check existing issues and discussions
- Open a new issue for questions
- Join our community chat

Thank you for contributing! 🎉
