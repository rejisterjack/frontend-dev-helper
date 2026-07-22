# Privacy Policy — Frontend Dev Helper

**Last updated: May 13, 2026**

## Overview

Frontend Dev Helper ("FDH", "the extension") is a browser developer tools extension. We respect your privacy and collect minimal data.

## Data Collection

### What we do NOT collect

- Personal information (name, email, address)
- Browsing history or website content
- Authentication credentials
- Cookies or session tokens
- Keystrokes or form data

### What is stored locally

All extension data is stored exclusively in your browser's local storage (`chrome.storage.local`):

- **Settings**: Theme preference, tool configurations
- **AI Configuration**: Model and provider selection (only stored locally).
  The **API key itself is encrypted at rest** with an AES-GCM key kept in
  `chrome.storage.session` (in-memory, cleared on browser close). It is
  transmitted only to your chosen AI provider when you use AI features.
- **GitHub Token**: Encrypted at rest (same scheme as the AI key). Only used
  when you click "Post to PR" to add a comment via the GitHub API.
- **VS Code Bridge Token**: Encrypted at rest. Required to authenticate the
  localhost WebSocket connection to the VS Code extension.
- **Tool State**: Which tools are active
- **Session Recordings**: Debugging session events (stored in IndexedDB, max 100MB)
- **Visual Regression Baselines**: Screenshot comparisons (stored locally)

### Encryption at rest

Sensitive credentials (AI API key, GitHub token, VS Code bridge token) are
encrypted with WebCrypto AES-GCM before being written to
`chrome.storage.local`. The encryption key is generated on first run and
kept in `chrome.storage.session`, which is scoped to the extension process
and wiped when the browser closes. An attacker who copies your browser
profile directory while the browser is closed obtains only ciphertext.

### What is transmitted externally

The extension **only** makes network requests when you explicitly configure and use these features:

1. **AI Assistant**: Messages are sent to your configured AI provider (OpenRouter, Ollama, or custom endpoint). You choose the provider and API key. When using Ollama (local), no data leaves your machine.
2. **GitHub Integration**: Audit results are posted as PR comments only when you click "Post to PR". Requires your GitHub Personal Access Token.
3. **VS Code Bridge**: Element/source data is sent to a local WebSocket connection (`ws://127.0.0.1:9456`, loopback only). Never leaves your machine. The connection requires a shared secret from the VS Code extension; both sides validate every message against a strict schema before processing.

**No data is sent to the extension developers or any third-party analytics service.**

## Telemetry

Telemetry is **off by default**. If you opt in, the extension collects anonymous, aggregated usage data:

- Tool activation/deactivation counts
- Extension open/close events
- AI query counts (not content)

**Telemetry does NOT include:** URLs, page content, code, personal data, or anything that could identify you or the websites you visit.

## Permissions

| Permission                  | Why                                                     |
| --------------------------- | ------------------------------------------------------- |
| `activeTab`                 | Access current tab for DOM inspection                   |
| `storage`                   | Save settings and tool state locally                    |
| `tabs`                      | Communicate between popup/content/background scripts    |
| `scripting`                 | Inject content scripts for tool overlays                |
| `clipboardWrite`            | Copy tool output (selectors, colors, code) to clipboard |
| `notifications`             | Notify when long-running tools complete                 |
| `contextMenus`              | Right-click menu to activate tools                      |
| `sidePanel`                 | Show tools in Chrome side panel                         |
| `http://*/*`, `https://*/*` | Inspect elements and inject overlays on any page        |

## Third-Party Services

- **OpenRouter** (openrouter.ai): Optional AI provider. Subject to [OpenRouter's Privacy Policy](https://openrouter.ai/privacy).
- **Ollama** (localhost): Optional local AI. No data leaves your machine.
- **GitHub API**: Optional PR comment posting. Subject to [GitHub's Privacy Policy](https://docs.github.com/en/site-policy/privacy-policies).

## Children's Privacy

This extension is a developer tool and is not directed at children under 13.

## Changes

We may update this policy. Changes will be reflected in the "Last updated" date above.

## Contact

For privacy questions, open an issue at [github.com/rejisterjack/frontend-dev-helper/issues](https://github.com/rejisterjack/frontend-dev-helper/issues).

## License

This extension is open source under the MIT License.
