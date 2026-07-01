# FDH-VSX (VS Code Extension)

## Companion Project

This VS Code extension is paired with **FDH-EXT** (`apps/ext/` in this monorepo), a Chrome extension. They communicate over a **WebSocket bridge on port 9456**. Changes to message handlers or protocol in one project must be reflected in the other.

## Architecture: Browser ↔ VS Code Bridge

```
┌─ FDH-EXT (Chrome Extension) ───────────────┐   WebSocket    ┌─ FDH-VSX (VS Code Extension) ──┐
│                                              │   port 9456    │                                 │
│  Tools (inspection, CSS, AI)                 │ ──────────────>│  handlers.ts                   │
│    ↓ call bridge.send() or bridge.jumpTo()   │                │    ↓ route to handler functions │
│  vscode-bridge.ts ─ WebSocket client         │                │  decorations.ts ─ editor glow   │
│  vscode-protocol.ts ─ message type defs      │                │  diagnostics.ts ─ Problems panel│
│  element-source-resolver.ts ─ DOM → source   │                │  server.ts ─ WebSocket server   │
└──────────────────────────────────────────────┘                └─────────────────────────────────┘
```

### Key Files

| File                 | Role                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server.ts`      | WebSocket server (`BridgeServer`). Runs on configurable port (default 9456). Broadcasts to all connected clients.                       |
| `src/handlers.ts`    | Routes incoming messages to handler functions. Contains `resolveFilePath()` with source map path override support.                      |
| `src/decorations.ts` | `highlightRange()`, `clearHighlights()`, `highlightLine()` — applies yellow background glow in editor when browser inspects an element. |
| `src/diagnostics.ts` | `FDHDiagnostics` singleton. Populates VS Code Problems panel with issues sent from browser. Severity mapping: error/warning/info.       |
| `src/extension.ts`   | Entry point. Starts `BridgeServer`, inits `FDHDiagnostics`, registers commands (`fdh.restartServer`, `fdh.showStatus`).                 |

### Supported Message Types (from FDH-EXT)

| Message              | Handler                    | What It Does                                                                             |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `JumpToSource`       | `handleJumpToSource`       | Opens file at line/column + highlights line                                              |
| `OpenInEditor`       | `handleOpenInEditor`       | Opens file at position                                                                   |
| `ApplyFix`           | `handleApplyFix`           | Replaces full file content                                                               |
| `InspectElement`     | `handleInspectElement`     | Logs element info to output channel                                                      |
| `HighlightSource`    | `handleHighlightSource`    | Opens file + applies range decoration                                                    |
| `ApplyCSSEdit`       | `handleApplyCSSEdit`       | Finds selector in file, applies targeted CSS property changes via `vscode.WorkspaceEdit` |
| `PreviewFix`         | `handlePreviewFix`         | Opens VS Code diff editor with accept/reject buttons                                     |
| `ApplySourceFix`     | `handleApplySourceFix`     | Precise range-based edits via `vscode.WorkspaceEdit`                                     |
| `PublishDiagnostics` | `handlePublishDiagnostics` | Populates Problems panel with issues from browser scan                                   |
| `ClearDiagnostics`   | `handleClearDiagnostics`   | Clears FDH diagnostic collection                                                         |
| `CreateFile`         | `handleCreateFile`         | Creates new file in workspace, optionally opens it                                       |

### Source Map Path Resolution

`resolveFilePath()` in `handlers.ts` resolves browser source paths to workspace files:

1. Applies `fdh.sourceMapPathOverrides` from VS Code settings (e.g. `webpack:///./src/` → `src/`)
2. Strips `webpack:///` and `webpack-internal:///` prefixes
3. Falls back to workspace-relative or absolute path

### Configuration (`fdh.*` settings)

| Setting                      | Default                                                  | Description                              |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `fdh.port`                   | 9456                                                     | WebSocket port                           |
| `fdh.autoStart`              | true                                                     | Auto-start server on VS Code open        |
| `fdh.sourceMapPathOverrides` | `{ "webpack:///./src/": "src/", "webpack:///./": "./" }` | Source map path → workspace path mapping |

## Build

- `pnpm run compile` — type-check + lint + esbuild (dev)
- `pnpm run package` — production build
- `npx @vscode/vsce package --no-dependencies` — package `.vsix` for installation
- Install: `code --install-extension fdh-vsx-0.0.1.vsix`

## When Modifying the Bridge

1. **Adding a new message type**: Add the type string to the union in `FDH-EXT/lib/vscode-protocol.ts` AND add a handler + entry in `handlerMap` in `FDH-VSX/src/handlers.ts`. Both must be updated together.
2. **Changing a payload**: Update the payload interface in `vscode-protocol.ts` AND the cast in the corresponding handler in `handlers.ts`.
3. **Source map resolution**: If path resolution breaks for a new bundler, add a prefix pattern to `fdh.sourceMapPathOverrides` in VS Code settings.
