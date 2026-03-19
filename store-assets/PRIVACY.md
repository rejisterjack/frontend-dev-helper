# Privacy Policy

## FrontendDevHelper Extension

**Last Updated:** March 19, 2024

### Overview

FrontendDevHelper is committed to protecting your privacy. This Privacy Policy explains how we handle data in our browser extension.

### Data Collection

**We do NOT collect any personal data.**

FrontendDevHelper operates entirely locally within your browser. We do not:
- Track your browsing history
- Collect personal information
- Send data to external servers
- Use analytics or telemetry
- Store data in the cloud

### Data Storage

All data is stored locally on your device using:
- `chrome.storage.local` - for extension settings
- `chrome.storage.session` - for temporary tool states

This data never leaves your browser and is only accessible by the extension.

### Permissions

Our extension requests these permissions:

| Permission | Purpose |
|------------|---------|
| `activeTab` | To analyze and debug the current webpage |
| `storage` | To save your tool preferences |
| `scripting` | To inject debugging tools into pages |
| `clipboardWrite` | To copy CSS, colors, and measurements |
| `tabs` | To communicate between popup and content scripts |

### Third-Party Services

We do not use any third-party services, analytics, or external APIs.

### Website Access

The extension can run on any website you visit to provide debugging tools. However:
- We do not record or transmit website data
- All analysis happens locally in your browser
- No data is sent to our servers (we don't have any)

### Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date.

### Contact

If you have any questions about this Privacy Policy, please open an issue on our GitHub repository.

### Open Source

FrontendDevHelper is open source. You can review our code at:
https://github.com/rejisterjack/frontend-dev-helper
