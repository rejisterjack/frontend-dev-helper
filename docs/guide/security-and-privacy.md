# Security & privacy

This note summarizes how FrontendDevHelper handles **user pages**, **extension pages**, **network**, and **secrets**. It is aimed at reviewers and contributors—not end-user marketing copy.

## Data locality

- **Tool state, presets, license cache, and most preferences** live in `chrome.storage.local` / `chrome.storage.sync` (see `src/utils/storage.ts`). They are not sent to our servers unless you use optional features that explicitly call an API (e.g. OpenRouter for AI).
- **API keys** (OpenRouter, custom LLM base URL) are stored in extension storage from the Options page. They are **not** injected into arbitrary page JavaScript; AI calls run from the **extension background** or isolated extension contexts.

## Content scripts & messaging

- Content scripts communicate with the **service worker** via `chrome.runtime.sendMessage` with a fixed `type` discriminator. Handlers should **validate** `type` and payload shape before acting (see `src/background/message-router.ts` and tool handlers).
- **Do not** execute strings from page or devtools as code in the content script. Prefer structured messages and small, reviewed eval only inside **devtools** / `chrome.scripting` where the platform requires it.
- User-facing HTML built from tool output should go through **`escapeHtml`** / sanitization where dynamic strings are interpolated (see `src/utils/sanitize.ts` and security tests under `tests/security/`).

## Content Security Policy (extension pages)

`public/manifest.json` sets `content_security_policy.extension_pages` roughly to:

- `default-src 'none'`
- `script-src 'self'`
- `style-src 'self' 'unsafe-inline'` (required for many inline UI patterns in extension HTML)
- `connect-src` includes **`https://openrouter.ai`** for bundled AI features.

**Custom LLM / license server:** If you add `fetch()` to another HTTPS origin from an extension page or background, you **must** add that host to `connect-src` in the manifest or the browser will block the request.

## `web_accessible_resources`

The manifest exposes `assets/*` and `icons/*` to `<all_urls>` so the built extension can load chunks and icons where the platform requires web-accessible URLs. Keep this list **minimal**—do not add broad `*` globs or unrelated paths.

## Host permissions

`host_permissions: ["<all_urls>"]` allows tools (CSS, layout, network, screenshots) to run on developer-chosen pages. This is intentional for a devtools-style extension. We still avoid shipping a **remote code** story: code runs from the packed extension, not arbitrary URLs.

## Supply chain

- Prefer **pinned** dependencies (`pnpm-lock.yaml`, CI `--frozen-lockfile`).
- Run **`pnpm run lint`**, **`pnpm run type-check`**, and tests before release.

## Reporting issues

If you find a way for **untrusted page content** to read extension-only data or bypass message validation, please report it responsibly (e.g. GitHub Security Advisories for the repo).
