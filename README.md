# 🔬 FrontendDevHelper — Ultimate Frontend Developer Toolkit

> **One extension. Every visual debugging tool you actually need.**
> Built for Chrome, Brave & Firefox · Manifest V3 · Open Source

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/rejisterjack/frontend-dev-helper)
[![Tools](https://img.shields.io/badge/tools-24-success.svg)](FEATURES.md)
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

Frontend developers rely on 8–12 separate browser extensions for visual debugging. Most are built on deprecated Manifest V2 and are now broken on modern browsers.

**FrontendDevHelper is the unified, modern replacement.**

- ✅ **24 powerful tools** in one extension (more than any competitor!)
- ✅ **Manifest V3** from day one
- ✅ **Zero data collection** — everything runs locally
- ✅ **Open source** and free forever
- ✅ **AI-powered** smart suggestions with auto-fixes

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
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Install-blue?style=for-the-badge&logo=google-chrome)](https://chrome.google.com/webstore/detail/frontenddevhelper/PLACEHOLDER_ID)

👉 [Install FrontendDevHelper from Chrome Web Store](https://chrome.google.com/webstore/detail/frontenddevhelper/PLACEHOLDER_ID)

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

| Shortcut | Action |
|----------|--------|
| `Alt+P` | Toggle DOM Outliner |
| `Alt+S` | Toggle Spacing Visualizer |
| `Alt+F` | Toggle Font Inspector |
| `Alt+C` | Toggle Color Picker |
| `Alt+M` | Toggle Pixel Ruler |
| `Alt+B` | Toggle Breakpoint Overlay |
| `Ctrl+Shift+F` | Open popup |
| `Ctrl+Shift+P` | Open Command Palette |
| `Esc` | Disable all tools |

---

## 🛠️ Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

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
