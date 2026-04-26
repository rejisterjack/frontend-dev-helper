# Security Model

## Content Script Security

- All dynamic content inserted via innerHTML is escaped using `escapeHtml()` from `src/utils/sanitize.ts`
- Color values are validated with `sanitizeColor()` before CSS injection
- URLs are validated with `sanitizeUrl()` to block `javascript:` protocol
- Shadow DOM isolation used for component tree visualization

## API Key Storage

- LLM API keys stored in `chrome.storage.session` (cleared on browser restart)
- Not persisted to `chrome.storage.local`
- Never transmitted to third parties except the configured LLM provider

## Content Security Policy

- `script-src 'self'` only — no inline scripts
- `style-src 'self' 'unsafe-inline'` — required for content script overlays
- `connect-src` limited to `https://openrouter.ai` (or user-configured endpoint)
- `object-src 'self'`

## Permissions Justification

- `<all_urls>`: Required for debugging tools to inspect any website
- `activeTab`: Access current tab for tool operations
- `storage`: Persist settings and tool states
- `scripting`: Dynamic script injection for advanced features

## Monetization Security

- Webhook signature verification via Stripe
- Cryptographic license key generation (`crypto.randomBytes`)
- Environment variable validation on startup
- Metadata schema validation with Zod

## Reporting

Report security vulnerabilities via GitHub Issues or security@frontenddevhelper.com
