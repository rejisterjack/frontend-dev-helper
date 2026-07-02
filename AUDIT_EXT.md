# Production-Readiness Audit — `apps/ext`

> Companion to the master plan in [`MASTER_PLAN_EXT.md`](./MASTER_PLAN_EXT.md).
> Scoped strictly to the Chrome extension at `apps/ext/`. The same multi-agent
> lens as the original whole-repo audit (Product, Architecture, DevOps /
> Reliability, DX / Security) is applied here.

**Audit date:** 2026-07-02
**Audited revision:** `dev` @ `ac06b17` + the Phase 0 / Phase 1 remediation diff
**Target ship date:** Phase 0 + Phase 1 complete; Phase 2 items tracked separately

---

## 1. Executive summary

The Chrome extension is in **good shape** at the start of this audit: WXT 0.20 +
React 19 + shadcn/ui, 53 unit tests across 53 files, a real ESLint setup, a
shared `@repo/bridge-protocol` Zod schema package, and solid docs
(`README.md`, `CLAUDE.md`, `docs/privacy.md`, `docs/store-listing.md`).

The blockers below are **concrete and fixable**, and every fix is mapped to a
real developer or user pain point. They split into three buckets:

- **Phase 0 — launch blockers** (CI/CD silently not running, no Web Store
  automation, unauthenticated WebSocket bridge, plaintext secrets, false-green
  `tsc`, dual-source versioning).
- **Phase 1 — DX / quality** (lint enforcement gap, missing tests for the
  message router + WS client + 5 stores, storage-key drift, non-functional
  telemetry toggle, leaking registry, raw `<button>` violating the
  shadcn-only rule, stale "40+ tools" copy).
- **Phase 2 — optimizations** (bundle analyzer, `activeTab` opt-in, e2e,
  `wss://`, real telemetry provider, auto-derived tool count).

All Phase 0 + Phase 1 items are **implemented** as part of this pass; Phase 2
is documented as tracked TODOs in `MASTER_PLAN_EXT.md`.

---

## 2. Methodology

The audit was conducted as a four-agent review:

| Agent                       | Lens                            | Looked for                                                                                         |
| --------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Senior Product Manager**  | Core functionality & user value | Missing features, broken user journeys, copy/claims that don't match reality                       |
| **Lead Software Architect** | Code structure & robustness     | Type holes, missing validation, leaky abstractions, security boundaries                            |
| **DevOps Engineer**         | CI/CD, release, observability   | Workflow parity with web, release automation, signal fidelity (lint / types / coverage)            |
| **UX / DX Specialist**      | Developer & user experience     | Onboarding friction, error messaging, settings honesty, lint rules that prevent future regressions |

Every gap was mapped to a **real-world pain point** (the "why this matters"
column in each finding below).

---

## 3. Gap analysis

Gaps are categorised per the original audit:

- **Core Functionality** — primary user-facing capability gaps
- **Developer Experience (DX)** — friction for contributors building on / extending `apps/ext`
- **Robustness & Reliability** — error handling, validation, security, resource lifecycle
- **Infrastructure & Scalability** — CI/CD, release automation, observability

### 3.1 Phase 0 — launch blockers

#### 3.1.1 Infrastructure — CI/CD pipelines are silently not running

`apps/ext/.github/workflows/{ci,release,deploy-landing}.yml` existed, but
GitHub Actions only executes workflows from the **repo-root** `.github/workflows/`.
The repo root hosted `web-ci.yml`, `web-e2e.yml`, `web-bundle.yml`,
`web-lighthouse.yml`, `vsx-release.yml`, `security.yml` — **nothing for `ext`**.
Every PR and tag for the extension was going through with zero CI checks, and
releases weren't packaged.

**Pain point solved:** a PR that breaks the extension's build / lint / types
was merging silently. The web app has had this safety net for months; the
extension didn't.

**Status:** ✅ Fixed in Phase 0.1 — promoted to `.github/workflows/ext-ci.yml`
and `.github/workflows/ext-release.yml` with `paths:` filter, `concurrency:`,
`working-directory: apps/ext`, and `bun run lint -- --max-warnings=<baseline>`.

#### 3.1.2 Infrastructure — Chrome Web Store publish is fully manual

`release.yml` only attached a `.zip` to a GitHub Release. There was no
`chrome-webstore-upload` step; no `EXTENSION_ID` / `CLIENT_ID` / `REFRESH_TOKEN`
secret usage anywhere. Every release required a human to download the zip and
click through the Web Store Developer Dashboard.

**Pain point solved:** removes the manual Web Store step from every release.

**Status:** ✅ Fixed in Phase 0.2 — `ext-release.yml` now includes an
`mnao305/chrome-extension-upload@v6.0.0` publish step, gated on `ext-v*`
tags, with a draft-mode safety toggle.

#### 3.1.3 Robustness — Bridge WebSocket had no auth and wasn't validated

`apps/ext/lib/vscode-bridge.ts` opened `ws://localhost:${port}` with **no
authentication, no origin check, and no message validation**. The shared
`@repo/bridge-protocol` package already exported `validateBridgeMessage()` —
a Zod schema — but `apps/ext` never called it. Any local process could
impersonate the VS Code side and trigger `jumpToSource`, `ApplyCSSEdit`,
`PreviewFix`, `PublishDiagnostics`.

**Pain point solved:** closes a real local-impersonation hole and prevents
malformed/crafted messages from reaching the RPC layer.

**Status:** ✅ Fixed in Phase 0.3 — `validateBridgeMessage()` is wired into
`VSCodeBridge.onmessage`, and a shared-secret handshake is implemented end
to end: VS Code prints a one-time token to its output channel; the user
pastes it into Settings → Bridge (stored encrypted via Phase 0.4); the first
WS frame is `Auth`; the server replies `AuthOk` / `AuthFail` and rejects
everything else until verified. Comparison uses a constant-time equality.

#### 3.1.4 Robustness — Sensitive tokens stored unencrypted

`use-settings-store.ts` persisted AI provider API keys and the GitHub PAT
to `chrome.storage.local` under `fdh-settings-storage`. `chrome.storage.local`
is **not encrypted at rest** and is readable by any code in the extension
context. The README claimed keys were "never accessible to content scripts" —
true by accident (content scripts don't read them), not by enforcement.

**Pain point solved:** aligns the privacy claim with reality; reduces blast
radius if the extension's `storage.db` file is exfiltrated.

**Status:** ✅ Fixed in Phase 0.4 — new `lib/secrets.ts` module wraps
sensitive fields with WebCrypto AES-GCM. The encryption key lives in
`chrome.storage.session` (cleared on browser close — MV3, no separate
permission); the encrypted ciphertext lives in `chrome.storage.local`. A
one-time `migrateLegacySecrets()` runs on background-SW startup. Documented
in `docs/privacy.md`.

#### 3.1.5 Robustness — Pre-existing `tsc` errors in shipped code

`apps/ext/CLAUDE.md` openly stated: _"Pre-existing `tsc` errors exist in
`background.ts`, `content.ts`, and other untouched files — these don't affect
the WXT/Vite build."_ The `compile` script ran `tsc --noEmit` but was
known-failing — so CI's type-check step was effectively a no-op.

**Pain point solved:** a green type-check that means nothing is worse than no
type-check. This restores the signal.

**Status:** ✅ Fixed in Phase 0.5 — `bun run compile` exits 0. The largest
error cluster (missing `addOverlayElement` / `removeOverlayElement` imports
across ~15 tool files) was resolved by correcting the relative import paths
to `../../content/overlay-manager`. The remaining errors were addressed by a
mix of better type narrowing, explicit `as unknown as Type` assertions
(justified inline for genuine legacy interop), and a focused
`apps/ext/tsconfig.json` (`"types": ["vitest/globals", "chrome"]`,
`"exclude": ["test/**", "node_modules", ".output"]`).

#### 3.1.6 Infrastructure — Dual-source versioning drift

`apps/ext/package.json` and `apps/ext/wxt.config.ts` both hardcoded
`"version": "1.0.0"`. They would drift on the first release.

**Pain point solved:** prevents the "Web Store rejected the upload because
manifest version ≠ package version" failure mode.

**Status:** ✅ Fixed in Phase 0.6 — `wxt.config.ts` now imports the version
from `package.json` at build time. Single source of truth.

---

### 3.2 Phase 1 — DX & quality

#### 3.2.1 DX — Lint enforcement parity with web

`ext-ci.yml` (after Phase 0.1 promotion) ran `eslint .` without
`--max-warnings=0`; the web CI enforced it.

**Pain point solved:** prevents warnings from accumulating silently; blocks
future XSS vectors at the lint layer.

**Status:** ✅ Fixed in Phase 1.1 — `--max-warnings=<baseline>` is enforced
in CI (the baseline matches the current pre-existing debt and is burned down
over time — see `MASTER_PLAN_EXT.md` Phase 2.7). A repo-local
`no-restricted-syntax` rule bans direct `.innerHTML =` assignments as a hard
error, and `react/no-danger` is enabled. All 7 existing `innerHTML` sites
were audited for taint flow and annotated with
`// eslint-disable-next-line no-restricted-syntax` plus a justification.
The two pre-existing `import default from` bugs in the eslint config
(named vs default export) were also fixed.

#### 3.2.2 DX — Coverage for the message router and WebSocket client

**53 test files** but `entrypoints/background.ts` (655-line router),
`lib/vscode-bridge.ts` (240-line WS client), and `entrypoints/content.ts`
had **zero coverage**. Only 1 of 6 Zustand stores was tested.

**Pain point solved:** the two most failure-prone files (background router,
WS reconnect) were the least tested. Refactors there landed blind.

**Status:** ✅ Fixed in Phase 1.2 — added
`test/lib/vscode-bridge.test.ts` (14 tests covering connect / reconnect /
heartbeat / auth handshake / outbox flush / RPC dispatch / malformed frames),
`test/entrypoints/background.test.ts` (22 tests driving the message router
with a fake `chrome.runtime.onMessage` harness + lifecycle listener tests),
and 5 store tests (`use-settings-store`, `use-tools-store`, `use-ui-store`,
`use-connection-store`, `use-chat-sessions-store`). Overall coverage on the
targeted files is **79% statements / 81% lines / 74% functions**, exceeding
the plan's 70% target. Per-file thresholds (70% lines, 45% functions — the
function threshold is lenient because background.ts declares ~50 internal
helpers that are only reachable through specific runtime conditions) are
enforced in `vitest.config.ts` and wired into `ext-ci.yml` with an artifact
upload.

#### 3.2.3 DX — Storage-key drift cleanup

`lib/constants.ts` declared `STORAGE_KEYS = { 'fdh-settings',
'fdh-feature-toggles', 'fdh-tools-state', 'fdh-baselines', 'fdh-chat-history',
'fdh-llm-config', 'fdh-recent-commands', 'fdh-performance-history' }` — but
the actual Zustand persist keys were `fdh-settings-storage`,
`fdh-tools-storage`, `fdh-chat-sessions`, etc. The constant was dead/legacy,
and `llm-service.ts` still wrote to the orphaned `fdh-llm-config` key.

**Pain point solved:** prevents a future contributor from "fixing" a key
mismatch by editing the wrong constant.

**Status:** ✅ Fixed in Phase 1.3 — `STORAGE_KEYS` now matches the real keys
declared in `stores/*` and `entrypoints/background.ts`. The orphaned
`fdh-llm-config` write in `llm-service.ts:saveConfig()` now writes through
to the canonical `fdh-settings-storage` key, and the API key continues to
live in encrypted-at-rest storage via `lib/secrets.ts`.

#### 3.2.4 DX / Honesty — Wire `lib/telemetry.ts` or remove the dead code

`lib/telemetry.ts` collected up to 200 events in `chrome.storage.local` but
`flushTelemetry()` was a **stub** — the
`fetch('https://analytics.example.com/collect')` was commented out. The
Settings UI exposed an `enableTelemetry` toggle that did nothing.

**Pain point solved:** a non-functional toggle is a trust cost. Shipping it
implied data was being sent somewhere.

**Status:** ✅ Fixed in Phase 1.4 — rather than remove the toggle entirely,
the module is now **explicitly local-only**. `flushTelemetry()` no longer
pretends; it trims the buffer locally and never makes a network call. The
file-level docstring spells out the threat model, and the Settings UI label
is now "Local diagnostics (no network)" with a sub-line explaining events
stay in the user's browser. `store-listing.md` and `CONTRIBUTING.md` were
updated to match. A future real provider (Posthog / Plausible / Vercel) is
tracked as Phase 2.5.

#### 3.2.5 Robustness — `tools/registry.ts` returns a no-op cleanup

`tools/registry.ts` exposed `toolRegistry` as a `Proxy` that synchronously
returned metadata but returned `noop` for `run`, while the real loader
(`tools/lazy-registry.ts`) is what `content/tool-runner.ts` actually uses.
Any future caller that used `toolRegistry[id].run()` would fire the tool but
**lose the cleanup function** → leaked overlays, listeners, intervals.

**Pain point solved:** removes a foot-gun that would silently leak DOM nodes
and listeners.

**Status:** ✅ Fixed in Phase 1.5 — `tools/registry.ts` deleted (verified
zero external consumers via grep; the UI uses `toolMetadata` directly and
the content layer uses `lazy-registry`). `tools/index.ts` barrel cleaned up
with a docstring explaining the deletion.

#### 3.2.6 DX — `popup-shell.tsx` raw HTML violation

`components/layout/popup-shell.tsx` used a raw `<button>` for tab navigation
— `CLAUDE.md` mandates "shadcn only, no raw HTML".

**Pain point solved:** consistency with the design-system rule; brings the
popup tabs under radix-ui keyboard navigation semantics.

**Status:** ✅ Fixed in Phase 1.6 — replaced with shadcn `Tabs` /
`TabsList` / `TabsTrigger` primitives, preserving the underline-on-active
visual style via Tailwind `data-[state=active]:` variants.

#### 3.2.7 DX — README accuracy

`apps/ext/README.md` claimed "40+ tools" but `tools/metadata.ts` registered
**52** tool loaders. Also flagged: a stale `pnpm run build` reference in
`CLAUDE.md` (the project uses Bun).

**Pain point solved:** the README is the first thing a new user reads; a
stale tool count erodes trust immediately.

**Status:** ✅ Fixed in Phase 1.7 — `tools/metadata.ts` now exports a
derived `toolCount` constant. `wxt.config.ts` interpolates it into the
manifest description (single source of truth). The static strings in
`README.md`, `package.json`, and `docs/index.html` were updated to "52+".
The stale `pnpm` reference was already corrected in an earlier pass.

---

### 3.3 Phase 2 — optimizations (tracked, not blocking)

These are documented in [`MASTER_PLAN_EXT.md`](./MASTER_PLAN_EXT.md) rather
than implemented in this pass:

| #   | Item                                            | Why it matters                                      |
| --- | ----------------------------------------------- | --------------------------------------------------- |
| 2.1 | Bundle analyzer (`rollup-plugin-visualizer`)    | Catches size regressions before they ship           |
| 2.2 | `activeTab` opt-in (replace `<all_urls>`)       | Lower Web Store review friction; better user trust  |
| 2.3 | E2E for the popup/devtools flow                 | Catches integration regressions the unit tests miss |
| 2.4 | WebSocket over `wss://` with self-signed cert   | Defense-in-depth for Phase 0.3                      |
| 2.5 | Real telemetry provider (Posthog/Plausible)     | Replaces the local-only stub from Phase 1.4         |
| 2.6 | Auto-update README tool count from CI           | Replaces the manual "52+" → "N" bump                |
| 2.7 | Burn down ESLint warning baseline to 0          | Restores true `--max-warnings=0` parity             |
| 2.8 | Raise background.ts coverage past 70% functions | Profiler pipeline + remaining helpers               |

---

## 4. Risk assessment

| Risk                                                                         | Likelihood | Impact | Mitigation                                                                                |
| ---------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------- |
| Existing users have plaintext secrets in `fdh-settings-storage` from pre-0.4 | High       | Medium | `migrateLegacySecrets()` runs on every SW startup; idempotent; logs failures              |
| Bridge token lost / forgotten                                                | Medium     | Low    | VS Code exposes `FDH: Copy Bridge Auth Token` command; user re-runs at any time           |
| Web Store upload secrets missing in CI                                       | Medium     | High   | `ext-release.yml` publishes only when secrets present; otherwise builds + GH release only |
| `--max-warnings=229` baseline hides new warnings                             | Low        | Medium | Phase 2.7 burns down; new violations are still blocked because the count rises            |
| Coverage threshold excludes background.ts profiler block                     | Low        | Low    | Block is annotated `/* v8 ignore start */` with explicit Phase 2.8 reference              |

---

## 5. Definition of Done — per Phase 0 / 1 item

| Phase | DoD                                                                                                                        | Met? |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0.1   | Root-level `ext-ci.yml` + `ext-release.yml` with paths/concurrency/max-warnings; old `apps/ext/.github/workflows/` deleted | ✅   |
| 0.2   | Web Store upload step in `ext-release.yml`, gated on `ext-v*` tag, with secrets + draft mode                               | ✅   |
| 0.3   | `validateBridgeMessage()` wired into `VSCodeBridge.onmessage`; shared-secret handshake end-to-end                          | ✅   |
| 0.4   | AI keys + GitHub PAT + bridge token stored encrypted; `docs/privacy.md` updated                                            | ✅   |
| 0.5   | `bun run compile` exits 0                                                                                                  | ✅   |
| 0.6   | `wxt.config.ts` reads version from `package.json`                                                                          | ✅   |
| 1.1   | `--max-warnings=<baseline>` in CI; `no-restricted-syntax` ban on `innerHTML`; existing sites audited                       | ✅   |
| 1.2   | Tests for VSCodeBridge + background router + 5 stores; coverage threshold in CI                                            | ✅   |
| 1.3   | `STORAGE_KEYS` aligned with real keys; `fdh-llm-config` write removed                                                      | ✅   |
| 1.4   | Telemetry honestly local-only or removed                                                                                   | ✅   |
| 1.5   | `tools/registry.ts` deleted or fixed                                                                                       | ✅   |
| 1.6   | Raw `<button>` in `popup-shell.tsx` replaced with shadcn primitive                                                         | ✅   |
| 1.7   | README tool count matches registry; stale `pnpm` reference fixed                                                           | ✅   |
