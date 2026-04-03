# Firefox vs Chromium parity

| Area | Chromium | Firefox |
|------|----------|---------|
| Manifest | MV3 | MV3 (Firefox Add-ons) |
| `sidePanel` API | Supported | Not available; side panel entry is ignored or rejected—use the popup |
| EyeDropper / color APIs | Full | May fall back to canvas-based picking where the API is missing |
| `chrome.*` namespaces | `chrome` | `browser` with compatibility shims where the build provides them |
| Extension shortcuts | `chrome://extensions/shortcuts` | `about:addons` → gear → Manage Extension Shortcuts |
| CSP `connect-src` | As in `public/manifest.json` | Verify AMO review requirements if you add remote endpoints |

When testing releases, validate the popup, content tools, and options on both targets.
