# FDH-VSX (VS Code Extension)

## Companion Project

This VS Code extension is paired with **FDH-EXT** (`apps/ext/` in this monorepo), a Chrome extension. They communicate over a **WebSocket bridge on `127.0.0.1:9456`** with a shared auth token. Changes to message handlers or protocol in one project must be reflected in the other via `@repo/bridge-protocol`.

## Architecture: Browser ↔ VS Code Bridge

```
┌─ FDH-EXT (Chrome Extension) ───────────────┐   WebSocket     ┌─ FDH-VSX (VS Code Extension) ──┐
│                                              │ 127.0.0.1:9456 │                                 │
│  Tools (inspection, CSS, AI)                 │ ──────────────>│  handlers.ts                   │
│    ↓ call bridge.send() or bridge.jumpTo()   │   + Auth token │    ↓ route to handler functions │
│  vscode-bridge.ts ─ WebSocket client         │                │  decorations.ts ─ editor glow   │
│  @repo/bridge-protocol ─ message type defs   │                │  diagnostics.ts ─ Problems panel│
│  element-source-resolver.ts ─ DOM → source   │                │  server.ts ─ WebSocket server   │
└──────────────────────────────────────────────┘                └─────────────────────────────────┘
```

Protocol source of truth: `packages/bridge-protocol` (`@repo/bridge-protocol`).
`apps/ext/lib/vscode-protocol.ts` is a thin re-export for back-compat only.

### Key Files

| File                 | Role                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/server.ts`      | WebSocket server (`BridgeServer`). Binds `127.0.0.1` (default port 9456). Auth handshake; closes after 5 `AuthFail`s.                   |
| `src/handlers.ts`    | Routes incoming messages to handler functions. Contains `resolveFilePath()` with source map path override support.                      |
| `src/decorations.ts` | `highlightRange()`, `clearHighlights()`, `highlightLine()` — applies yellow background glow in editor when browser inspects an element. |
| `src/diagnostics.ts` | `FDHDiagnostics` singleton. Populates VS Code Problems panel with issues sent from browser. Severity mapping: error/warning/info.       |
| `src/extension.ts`   | Entry point. Starts `BridgeServer`, inits `FDHDiagnostics`, registers commands (`fdh.restartServer`, `fdh.showStatus`, copy token).     |

### Configuration (`fdh.*` settings)

| Setting                      | Default                                                  | Description                              |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------- |
| `fdh.port`                   | 9456                                                     | WebSocket port                           |
| `fdh.autoStart`              | true                                                     | Auto-start server on VS Code open        |
| `fdh.sourceMapPathOverrides` | `{ "webpack:///./src/": "src/", "webpack:///./": "./" }` | Source map path → workspace path mapping |

## Build

- `bun run compile` — type-check + lint + esbuild (dev)
- `bun run package` — production build
- `bun run test` — unit tests for `BridgeServer`
- `bunx @vscode/vsce package --no-dependencies` — package `.vsix` for installation

## When Modifying the Bridge

1. **Adding a new message type**: Update `@repo/bridge-protocol` **and** add a handler + entry in `handlerMap` in `apps/vsx/src/handlers.ts`.
2. **Changing a payload**: Update the payload in `@repo/bridge-protocol` **and** the cast in the corresponding handler in `handlers.ts`.
3. **Source map resolution**: If path resolution breaks for a new bundler, add a prefix pattern to `fdh.sourceMapPathOverrides` in VS Code settings.
