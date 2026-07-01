# Frontend Dev Helper

> 40+ professional visual debugging tools in one Manifest V3 browser
> extension — plus a VS Code bridge, an AI agent surface, and a SaaS
> marketing/account site.

[![CI](https://github.com/USER/frontend-dev-helper/actions/workflows/web-ci.yml/badge.svg)](.github/workflows/web-ci.yml)

**Frontend Dev Helper** is a Bun + Turborepo monorepo that ships **four
products** working together: a flagship browser extension, a VS Code bridge
extension, a Next.js marketing/account web app, and a vendored Chrome DevTools
MCP server that exposes Chrome control to AI agents.

---

## What's in this monorepo?

```mermaid
graph TB
    subgraph UserDevice[User Device]
        Browser[Browser<br/>apps/ext<br/>40+ visual tools]
        VSCode[VS Code<br/>apps/vsx<br/>Jump-to-source bridge]
    end

    subgraph Cloud[Cloud]
        WebApp[apps/web<br/>Next.js 15 + Postgres<br/>Auth, referrals, billing]
        Providers[LLM Providers<br/>OpenRouter / Ollama / Fireworks / ZAI]
    end

    subgraph Optional[Optional — AI Agents]
        Mcp[apps/mcp<br/>chrome-devtools-mcp<br/>vendored from Google]
        Agent[AI Client<br/>Cursor / Claude / etc.]
    end

    Browser <-->|"WebSocket :9456<br/>JumpToSource / ApplyFix"| VSCode
    Browser -->|"AI requests<br/>user-configured key"| Providers
    Browser -->|"Auth, referrals, license"| WebApp
    Agent <-->|"stdio MCP"| Mcp
    Mcp -->|"Puppeteer"| Browser
```

| App                   | Path                   | What it is                                                                                                                               |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser extension** | [`apps/ext`](apps/ext) | WXT + React 19 + shadcn/ui + Zustand. 40+ tools across Inspection, CSS, Performance, A11y, AI, Utilities. Manifest V3, Chrome + Firefox. |
| **VS Code extension** | [`apps/vsx`](apps/vsx) | WebSocket bridge on port 9456. Receives jump-to-source, apply-fix, publish-diagnostics messages from the browser extension.              |
| **Web app**           | [`apps/web`](apps/web) | Next.js 15 marketing site, NextAuth (Credentials + Google + GitHub), Postgres via Prisma, Resend email, referral program, dashboard.     |
| **MCP server**        | [`apps/mcp`](apps/mcp) | Vendored Google `chrome-devtools-mcp` — exposes 43 Puppeteer tools to AI clients via MCP.                                                |

Shared packages:

| Package                   | Path                                                       | What it is                                                        |
| ------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `@repo/ui`                | [`packages/ui`](packages/ui)                               | Shared React components (stub).                                   |
| `@repo/eslint-config`     | [`packages/eslint-config`](packages/eslint-config)         | Shared ESLint flat configs (`base`, `next-js`, `react-internal`). |
| `@repo/typescript-config` | [`packages/typescript-config`](packages/typescript-config) | Shared `tsconfig.json` bases.                                     |

---

## Quickstart

**Prerequisites:** Node 22+ (see [`.nvmrc`](.nvmrc)), Bun 1.3+.

```sh
# 1. Install
git clone <this-repo> frontend-dev-helper
cd frontend-dev-helper
bun install

# 2. Configure the web app (only apps/web needs env vars)
cp apps/web/.env.example apps/web/.env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY, etc.

# 3. Run everything in dev (parallel across all workspaces)
bun run dev
```

### Run a single app

```sh
bun run dev --filter=web        # marketing/account site at http://localhost:7393
bun run dev --filter=ext        # browser extension via WXT HMR
bun run dev --filter=vsx        # VS Code extension host
bun run dev --filter=chrome-devtools-mcp   # MCP server
```

### Build, lint, type-check

```sh
bun run build         # turbo run build
bun run lint          # turbo run lint
bun run check-types   # turbo run check-types
bun run format        # prettier --write "**/*.{ts,tsx,md}"
```

For per-app deep dives, see:

- [`apps/ext/README.md`](apps/ext/README.md) — extension build, load-unpacked, tool authoring
- [`apps/web/README.md`](apps/web/README.md) — web app env vars, deploy, migrations
- [`apps/vsx/README.md`](apps/vsx/README.md) — VS Code extension dev + bridge protocol
- [`apps/mcp/README.md`](apps/mcp/README.md) — Google's chrome-devtools-mcp server docs

---

## Documentation

- **Audit & roadmap** — [`AUDIT.md`](AUDIT.md) and [`MASTER_PLAN.md`](MASTER_PLAN.md)
- **Architecture & contributing per app** — see each app's `README.md` and `CLAUDE.md`
- **Security** — [`apps/mcp/SECURITY.md`](apps/mcp/SECURITY.md) covers the MCP server;
  web app security model is documented in [`apps/web/README.md`](apps/web/README.md)

---

## License

- `apps/mcp` — Apache-2.0 (Google LLC, vendored upstream)
- All other code in this monorepo — see [`LICENSE`](LICENSE)

## Acknowledgements

- [`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) by Google
- [WXT](https://wxt.dev) — Web Extension Toolkit
- [shadcn/ui](https://ui.shadcn.com) — UI components
