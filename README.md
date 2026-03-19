# 🔬 FrontendDevHelper — Ultimate Frontend Developer Toolkit

> **One extension. Every visual debugging tool you actually need.**
> Built for Chrome, Brave & Firefox · Manifest V3 · Open Source

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/rejisterjack/frontend-dev-helper)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)](public/manifest.json)
[![CI](https://github.com/rejisterjack/frontend-dev-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/rejisterjack/frontend-dev-helper/actions)

---

## 🎯 Why FrontendDevHelper?

Frontend developers rely on 8–12 separate browser extensions for visual debugging. Most are built on deprecated Manifest V2 and are now broken on modern browsers.

**FrontendDevHelper is the unified, modern replacement.**

- ✅ **11 powerful tools** in one extension
- ✅ **Manifest V3** from day one
- ✅ **Zero data collection** — everything runs locally
- ✅ **Open source** and free forever

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
| **Z-Index Visualizer** | 📚 | Stacking order & hierarchy |
| **Tech Detector** | 🔍 | Detect frameworks & libraries |

---

## 🚀 Installation

### From Chrome Web Store
_Coming soon!_

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
