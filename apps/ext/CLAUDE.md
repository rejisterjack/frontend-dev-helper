# FDH Extension (Browser)

## Companion Project

This Chrome extension is paired with **FDH-VSX** (`apps/vsx/` in this monorepo), a VS Code extension. They communicate over a **WebSocket bridge on port 9456**. Changes to the protocol or bridge in one project must be reflected in the other.

## Architecture: Browser ↔ VS Code Bridge

```
┌─ FDH-EXT (Chrome Extension) ───────────────┐   WebSocket    ┌─ FDH-VSX (VS Code Extension) ──┐
│                                              │   port 9456    │                                 │
│  Tools (inspection, CSS, AI)                 │ ──────────────>│  handlers.ts                   │
│    ↓ call bridge.send() or bridge.jumpTo()   │                │    ↓ route to handler functions │
│  vscode-bridge.ts ─ WebSocket client         │                │  decorations.ts ─ editor glow   │
│  vscode-protocol.ts ─ message type defs      │                │  diagnostics.ts ─ Problems panel│
│  element-source-resolver.ts ─ DOM → source   │                │  server.ts ─ WebSocket server   │
│  css-source-resolver.ts ─ CSS prop → source  │                │                                 │
└──────────────────────────────────────────────┘                └─────────────────────────────────┘
```

### Key Files

| File                             | Role                                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `lib/vscode-bridge.ts`           | WebSocket client singleton. `getBridge()` returns shared instance. Methods: `send()`, `jumpToSource()`, `openInEditor()` |
| `lib/vscode-protocol.ts`         | All message types and payload interfaces. **Must stay in sync with FDH-VSX handlers.**                                   |
| `lib/element-source-resolver.ts` | Resolves HTMLElement → `{ file, line, column }` via React fibers, Vue instances, or source map matching                  |
| `lib/css-source-resolver.ts`     | Resolves element + CSS property → source file/line via stylesheet source maps                                            |
| `lib/source-map-resolver.ts`     | Low-level source map consumer: `resolvePosition()`, `getSourceContent()`, `findSourceMapUrls()`                          |

### Message Flow

1. **Element → Source**: Tools call `resolveElementSource(el)` → if found, `bridge.jumpToSource(file, line, col)` → VS Code opens file + highlights line
2. **CSS → Source**: CSS Inspector calls `jumpToCSSSource(el, property)` → resolves stylesheet source map → VS Code opens CSS file
3. **CSS Edit Sync**: CSS Editor "Sync to VS Code" → `bridge.send({ type: 'ApplyCSSEdit', ... })` → VS Code applies targeted edits via `vscode.TextEdit`
4. **AI Fix Preview**: AI Auto-Fix "Fix in VS Code" → `bridge.send({ type: 'PreviewFix', ... })` → VS Code opens diff editor → user accepts/rejects
5. **Diagnostics**: AI Auto-Fix scan → `bridge.send({ type: 'PublishDiagnostics', ... })` → VS Code populates Problems panel

### Tools with VS Code Integration

| Tool               | Integration                                                |
| ------------------ | ---------------------------------------------------------- |
| Element Inspector  | Pin element → resolves source → "Open in VS Code" button   |
| React State Panel  | Extracts `_debugSource` from fiber → "Open source" button  |
| Vue State Panel    | Extracts `__file` from Vue instance → "Open source" button |
| Component Tree     | "→VS" button on component nodes → jump to source           |
| Framework DevTools | Click component card → jump to source                      |
| CSS Inspector      | Hover ↗ icon per property → jump to CSS source             |
| CSS Editor         | "Sync to VS Code" button → sends edits to source file      |
| AI Auto-Fix        | "Fix in VS Code" button → diff preview in VS Code          |
| Smart Suggestions  | "Fix in VS Code" button per suggestion                     |

## Build

- `bun run build` — production build to `.output/chrome-mv3/` (load unpacked in Chrome)
- `bun run compile` (`tsc --noEmit`) is **green** as of the Phase 0.5 audit pass — pre-existing type debt across `background.ts`, `content.ts`, and ~15 tool files has been cleared.

## Design System Rules

- **Always use shadcn/ui components** — no raw HTML elements (no plain `<button>`, `<div>` for cards, etc.). Every UI element must be a shadcn component.
- **Default shadcn styling only** — do not override, customize, or modify shadcn component styles. Use the default variants and props as provided by shadcn.
- **Install all UI components exclusively via the shadcn CLI** — `npx shadcn@latest add <component>`. Never manually create or copy UI components.
- **No custom Tailwind utility classes for things shadcn already provides** — use shadcn's built-in variants, sizes, and props instead of writing custom CSS.
