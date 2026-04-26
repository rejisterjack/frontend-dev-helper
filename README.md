# 🔬 FrontendDevHelper — Ultimate Frontend Developer Toolkit

> **One extension. Every visual debugging tool you actually need.**
> Built for Chrome, Brave & Firefox · Manifest V3 · Open Source

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/rejisterjack/frontend-dev-helper)
[![Tools](https://img.shields.io/badge/tools-27-success.svg)](FEATURES.md)
[![Code Size](https://img.shields.io/badge/code-50k%20lines-informational.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)](public/manifest.json)
[![CI](https://github.com/rejisterjack/frontend-dev-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/rejisterjack/frontend-dev-helper/actions)

---

## 🎉 What's New in v1.2.0

### 🏆 "Best of the Best" Release - 8 New Professional Tools!

- **⌨️ Command Palette** - VS Code-style quick access (Ctrl+Shift+P)
- **💾 Storage Inspector** - Debug LocalStorage, IndexedDB, Cookies, Cache
- **✨ AI Suggestions** - Smart analysis with 50+ detection patterns & auto-fixes
- **🌳 Component Tree** - Visualize React, Vue, Angular, Svelte components
- **🔥 Performance Flame Graph** - Profile JavaScript execution
- **🎯 Focus Debugger** - Visualize focus order & detect traps
- **📝 Form Debugger** - Analyze form validation & autofill
- **👁️ Visual Regression** - Screenshot comparison testing

[📖 Read the full changelog](CHANGELOG.md)

---

## 🎯 Why FrontendDevHelper?

**One sentence:** *It’s the “everything on the page at once” kit—overlays, audits, capture, and keyboard-first workflows that Chrome DevTools doesn’t ship as a single, cohesive extension.*

Frontend developers rely on 8–12 separate browser extensions for visual debugging. Most are built on deprecated Manifest V2 and are now broken on modern browsers.

**FrontendDevHelper is the unified, modern replacement.**

### DevTools alone? A pile of extensions? Here’s the difference

| | **Chrome DevTools** | **Many small extensions** | **FrontendDevHelper** |
|---|---------------------|---------------------------|------------------------|
| **Focus** | Incredible *inspector* & performance panels | One job each (color, ruler, a11y…) | **20+ visual/debug tools in one UX** (popup, palette, side panel, DevTools) |
| **On-page overlays** | Mostly panel-driven | Fragmented | **Unified toggles, exclusivity rules, presets** |
| **Keyboard flow** | DevTools-centric | Rarely consistent | **Command palette + shortcuts + same storage everywhere** |
| **Shipping** | Built into Chrome | V2 rot, inconsistent updates | **Manifest V3**, one codebase, OSS |

DevTools remains essential for deep debugging; this extension **complements** it with **product-style** workflows (capture, reports, responsive passes, regression baselines) without juggling installs.

- ✅ **27 professional tools** in one extension (see [FEATURES.md](FEATURES.md))
- ✅ **Manifest V3** from day one
- ✅ **Privacy-first by default** — tools run locally; optional AI calls only to providers you configure
- ✅ **Open source** and free forever
- ✅ **AI-powered** smart suggestions with auto-fixes (optional)

**Security & CSP notes for contributors:** [docs/guide/security-and-privacy.md](docs/guide/security-and-privacy.md)

---

## ✨ Features

### Core Tools

| Tool | Icon | Description |
|------|------|-------------|
| **DOM Outliner** | 🕸️ | Color-coded element outlines (Pesticide reborn) |
| **Spacing Visualizer** | 📐 | Margin & padding overlays on click |
| **Font Inspector** | 🔤 | Typography analysis with source detection |
| **Color Picker** | 🎨 | EyeDropper + palette extraction |
| **Pixel Ruler** | 📏 | Precise distance measurement |
| **Breakpoint Overlay** | 📱 | Viewport size & responsive breakpoints |

### Advanced Tools

| Tool | Icon | Description |
|------|------|-------------|
| **CSS Inspector** | 📝 | All computed properties by category |
| **Contrast Checker** | ♿ | WCAG AA/AAA accessibility compliance |
| **Flex/Grid Visualizer** | ⊞ | Visualize layout structures |
| **Z-Index Visualizer** | 📚 | Stacking order with **3D view** |
| **Tech Detector** | 🔍 | Detect frameworks & libraries |
| **Accessibility Audit** | 🛡️ | WCAG validator + ARIA checker |
| **Site Report Generator** | 📊 | Comprehensive analysis & reports |
| **Live CSS Editor** | ✏️ | Real-time CSS editing |
| **Screenshot Studio** | 📸 | Capture & annotate screenshots |
| **Animation Inspector** | 🎬 | Debug CSS animations |
| **Responsive Preview** | 📲 | Multi-device preview |
| **Design System Validator** | 🎨 | Design token consistency |
| **Network Analyzer** | 🌐 | Network request monitoring |

### 🆕 "Best of the Best" Tools

| Tool | Icon | Description |
|------|------|-------------|
| **Command Palette** | ⌨️ | Quick access to all tools via keyboard (Ctrl+Shift+P) |
| **Storage Inspector** | 💾 | Inspect LocalStorage, IndexedDB, Cookies, Cache |
| **AI Suggestions** | ✨ | Smart analysis with one-click auto-fixes |
| **Component Tree** | 🌳 | Visualize React, Vue, Angular, Svelte hierarchy |
| **Performance Flame Graph** | 🔥 | Visualize JavaScript execution & bottlenecks |
| **Focus Debugger** | 🎯 | Visualize focus order & detect focus traps |
| **Form Debugger** | 📝 | Debug form validation, autofill & accessibility |
| **Visual Regression** | 👁️ | Capture baselines & compare screenshots |

### Premium Features

- 📊 **Performance Tab** - Core Web Vitals, resource analysis, image optimization hints
- 📤 **Export & Share** - JSON, PDF, Markdown reports with screenshots
- 🎨 **Color Palette Extraction** - Complete harmonies and semantic categorization
- 🥽 **3D Z-Index View** - Interactive stacking visualization

---

## 🚀 Installation

### From Chrome Web Store
Publish via the [Chrome Web Developer Dashboard](https://chrome.google.com/webstore/devconsole) using a zip of `dist/`. Store builds rely on `update_url` in `public/manifest.json`; for day-to-day work, use **Load unpacked** on `dist/` and skip store update flow.

### From Firefox Add-ons
[![Firefox Add-ons](https://img.shields.io/badge/Firefox%20Add--ons-Install-orange?style=for-the-badge&logo=firefox)](https://addons.mozilla.org/en-US/firefox/addon/frontenddevhelper/)

👉 [Install FrontendDevHelper from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/frontenddevhelper/)

### Manual Installation (Developer Mode)

```bash
# 1. Clone the repository
git clone https://github.com/rejisterjack/frontend-dev-helper.git
cd frontend-dev-helper

# 2. Install dependencies
pnpm install

# 3. Build the extension
pnpm run build

# 4. Load in Chrome / Brave
# → Open chrome://extensions
# → Enable "Developer mode" (top right toggle)
# → Click "Load unpacked"
# → Select the /dist folder
```

---

## ⌨️ Keyboard Shortcuts

**Chrome’s extension API only allows 4 *default* shortcuts in the manifest**, so the extension pre-registers just these. Each command is still available under **Extensions → … → Shortcuts** (`chrome://extensions/shortcuts`) for you to assign.

| Shortcut (built-in) | Action |
|----------|--------|
| `Ctrl+Shift+F` (⌘⇧F on Mac) | Open popup |
| `Ctrl+Shift+P` (⌘⇧P on Mac) | Open Command Palette |
| `Alt+P` | Toggle DOM Outliner |
| `Alt+Shift+D` | Disable all tools |

| Suggested (assign in **chrome://extensions/shortcuts**) | Action |
|----------|--------|
| `Alt+S` | Toggle Spacing Visualizer |
| `Alt+F` | Toggle Font Inspector |
| `Alt+C` | Toggle Color Picker |
| `Alt+M` | Toggle Pixel Ruler |
| `Alt+B` | Toggle Breakpoint Overlay |
| … | Other toggles in the list |

---

## 🛠️ Development

```bash
# Start development server
pnpm run dev

# Run tests
pnpm test

# Run E2E tests
pnpm run test:e2e

# Build for production
pnpm run build

# Lint code
pnpm run lint

# Format code
pnpm run format
```

Weekly manual smoke checks: [docs/guide/dogfooding-checklist.md](docs/guide/dogfooding-checklist.md).

---

## 📁 Project Structure

```
frontend-dev-helper/
├── src/
│   ├── background/        # Service worker
│   ├── content/           # Content scripts (all tools)
│   ├── popup/             # React popup UI
│   ├── utils/             # Color utilities, DOM helpers
│   └── types/             # TypeScript types
├── dist/                  # Built extension
├── tests/                 # Unit & E2E tests
├── .github/workflows/     # CI/CD
└── store-assets/          # Store listing assets
```

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|------------|
| Extension | Chrome Manifest V3 |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Build | Vite + CRXJS |
| Testing | Vitest + Playwright |

---

## Security and privacy

- **Local-first**: Tooling runs in your browser; we do not operate a default telemetry backend.
- **Permissions**: Broad host access is required so debugging tools can run on the sites you choose. Review `public/manifest.json` before installing.
- **Optional AI**: When you add an OpenRouter API key in settings, requests go to [OpenRouter](https://openrouter.ai/) from the extension only when you use AI features. Page-derived content may be included in those requests—keep keys private and disable AI if you do not want network calls.

Firefox vs Chromium differences: [docs/firefox-parity.md](docs/firefox-parity.md).

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

[MIT](LICENSE) © FrontendDevHelper Contributors

---

## 🙏 Acknowledgments

- Inspired by the original [Pesticide](https://github.com/mrmrs/pesticide) extension
- Built with [Vite](https://vitejs.dev/) and [CRXJS](https://crxjs.dev/)
- Icons and UI inspired by modern design systems

---

> **Made with ❤️ for the frontend developer community**
