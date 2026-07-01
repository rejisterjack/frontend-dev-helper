# apps/vsx — Frontend Dev Helper VS Code Bridge

A small VS Code extension that runs a WebSocket server on port 9456 (default)
and bridges the browser extension's inspection/edit signals into the editor:
jump-to-source, apply CSS fixes, preview AI fixes as diffs, and populate the
Problems panel.

Pairs with [`apps/ext`](../ext) (the browser extension). The two communicate
over a documented message protocol — see [Bridge protocol](#bridge-protocol)
below.

---

## Quickstart

From the repo root:

```sh
bun install
bun run dev --filter=fdh-vsx        # esbuild + tsc watch in parallel
```

This launches an **Extension Development Host** with the FDH bridge loaded.
Press `F5` in VS Code (the workspace includes [`.vscode/launch.json`](.vscode/launch.json))
to start it.

### Build & package

```sh
bun run --filter=fdh-vsx compile       # type-check + esbuild (dev)
bun run --filter=fdh-vsx package       # production bundle
npx @vscode/vsce package --no-dependencies   # produces .vsix
code --install-extension fdh-vsx-0.0.1.vsix
```

### Scripts

| Script    | What it does                                        |
| --------- | --------------------------------------------------- |
| `dev`     | `node esbuild.js --watch` + parallel `tsc --watch`  |
| `compile` | type-check + esbuild bundle to `dist/extension.js`  |
| `package` | production bundle (minified)                        |
| `test`    | `@vscode/test-cli` (runs mocha tests under VS Code) |
| `lint`    | ESLint                                              |

### Configuration (`fdh.*` settings)

| Setting                      | Default                                                  | Description                                  |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------- |
| `fdh.port`                   | `9456`                                                   | WebSocket port the bridge listens on         |
| `fdh.autoStart`              | `true`                                                   | Auto-start the server when VS Code opens     |
| `fdh.sourceMapPathOverrides` | `{ "webpack:///./src/": "src/", "webpack:///./": "./" }` | Browser bundle path → workspace path mapping |
| `fdh.logLevel`               | `info`                                                   | Output channel verbosity                     |

### Commands

| Command             | Title                 |
| ------------------- | --------------------- |
| `fdh.restartServer` | Restart Bridge Server |
| `fdh.showStatus`    | Show Bridge Status    |

---

## Architecture

```
Browser extension (apps/ext)
    │
    │ WebSocket :9456
    ▼
apps/vsx/src/server.ts ─ BridgeServer (ws.WebSocketServer)
    │
    │ parses JSON message
    ▼
apps/vsx/src/handlers.ts ─ handlerMap routes to handler fn
    │
    ├── JumpToSource, OpenInEditor ─► opens file at line/column
    ├── HighlightSource             ─► decorations.ts (yellow line glow)
    ├── ApplyFix, ApplySourceFix    ─► vscode.WorkspaceEdit (replace)
    ├── ApplyCSSEdit                ─► find selector, apply property edits
    ├── PreviewFix                  ─► diff editor with accept/reject
    ├── PublishDiagnostics          ─► diagnostics.ts → Problems panel
    ├── ClearDiagnostics            ─► clear collection
    └── CreateFile                  ─► create + optionally open file
```

### Key files

| File                                       | Role                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| [`src/extension.ts`](src/extension.ts)     | `activate()` entry point. Starts server, registers commands, sets status bar.                           |
| [`src/server.ts`](src/server.ts)           | `BridgeServer` class. `ws.WebSocketServer` wrapper with ping/pong keepalive and `EADDRINUSE` handling.  |
| [`src/handlers.ts`](src/handlers.ts)       | `handlerMap` and per-message-type handler functions. `resolveFilePath()` for source-map path overrides. |
| [`src/decorations.ts`](src/decorations.ts) | `highlightLine()` / `highlightRange()` — yellow background glow decoration.                             |
| [`src/diagnostics.ts`](src/diagnostics.ts) | `FDHDiagnostics` singleton — bridges to the VS Code Problems panel.                                     |

---

## Bridge protocol

The message protocol is **defined in the browser extension** at
[`apps/ext/lib/vscode-protocol.ts`](../ext/lib/vscode-protocol.ts). This
extension consumes those messages.

**Maintenance hazard**: the protocol is currently duplicated between the two
apps. Both must be updated together when adding/changing a message type.
Track work to extract a shared `packages/bridge-protocol` package (see
[`MASTER_PLAN.md`](../../MASTER_PLAN.md), task 1.7).

### Message types

| Message              | Handler                    | What it does                                                  |
| -------------------- | -------------------------- | ------------------------------------------------------------- |
| `JumpToSource`       | `handleJumpToSource`       | Opens file at line/column + highlights line                   |
| `OpenInEditor`       | `handleOpenInEditor`       | Opens file at position                                        |
| `ApplyFix`           | `handleApplyFix`           | Replaces full file content                                    |
| `InspectElement`     | `handleInspectElement`     | Logs element info to output channel                           |
| `HighlightSource`    | `handleHighlightSource`    | Opens file + applies range decoration                         |
| `ApplyCSSEdit`       | `handleApplyCSSEdit`       | Finds selector in file, applies targeted CSS property changes |
| `PreviewFix`         | `handlePreviewFix`         | Opens VS Code diff editor with accept/reject                  |
| `ApplySourceFix`     | `handleApplySourceFix`     | Precise range-based edits                                     |
| `PublishDiagnostics` | `handlePublishDiagnostics` | Populates Problems panel with issues from browser scan        |
| `ClearDiagnostics`   | `handleClearDiagnostics`   | Clears FDH diagnostic collection                              |
| `CreateFile`         | `handleCreateFile`         | Creates new file in workspace, optionally opens it            |

### When modifying the bridge

1. **Adding a message type**: Add the type string to the union in
   `apps/ext/lib/vscode-protocol.ts` AND add a handler + entry in
   `handlerMap` in `apps/vsx/src/handlers.ts`. Both must be updated together.
2. **Changing a payload**: Update the payload interface in `vscode-protocol.ts`
   AND the cast in the corresponding handler in `handlers.ts`.
3. **Source map resolution**: If path resolution breaks for a new bundler,
   add a prefix pattern to `fdh.sourceMapPathOverrides` in VS Code settings.

---

## Testing

Current coverage is the default Yeoman stub at
[`src/test/extension.test.ts`](src/test/extension.test.ts). Real coverage
of the bridge protocol is tracked as task 1.6 in
[`MASTER_PLAN.md`](../../MASTER_PLAN.md).

To add a test, create a file under `src/test/` and use the `@vscode/test-cli`
runner:

```ts
import { expect } from "chai";
import { BridgeServer } from "../src/server";

suite("BridgeServer", () => {
  test("starts and stops cleanly", async () => {
    const server = new BridgeServer(9457);
    await server.start();
    expect(server.isRunning()).to.be.true;
    await server.stop();
  });
});
```

Run with `bun run --filter=fdh-vsx test`.

---

## Troubleshooting

| Symptom                         | Cause / Fix                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `EADDRINUSE :::9456`            | Another process (or a previous instance) holds the port. Run `fdh.restartServer`, or change `fdh.port`.                          |
| Browser extension won't connect | Make sure VS Code is open with the extension installed and `fdh.autoStart` is `true`. Check the status bar shows "FDH: Running". |
| Jump-to-source opens wrong file | Source map path overrides are wrong for your bundler. Edit `fdh.sourceMapPathOverrides`.                                         |
| Nothing in Problems panel       | The browser tool needs to send `PublishDiagnostics`. Check the browser extension's console.                                      |
