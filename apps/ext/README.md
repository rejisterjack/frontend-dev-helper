# FrontendDevHelper — Ultimate Frontend Developer Toolkit

> **One extension. Every visual debugging tool you actually need.**
> Built for Chrome & Firefox · Manifest V3 · Open Source

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/rejisterjack/frontend-dev-helper)
[![Tools](https://img.shields.io/badge/tools-50+-success.svg)](#features)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)](#)

---

## Why FrontendDevHelper?

Frontend developers rely on 8–12 separate browser extensions for visual debugging. Most are built on deprecated Manifest V2 and are now broken on modern browsers.

**FrontendDevHelper is the unified, modern replacement.**

- **50+ professional tools** in one extension
- **Manifest V3** from day one
- **Privacy-first** — tools run locally; optional AI calls only to providers you configure
- **Open source** and free forever
- **Modern stack** — React 19, shadcn/ui, Zustand, WXT, Tailwind CSS v4

---

## Features

### Inspection (15 tools)

| Tool                          | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| **DOM Outliner**              | Color-coded element outlines by depth               |
| **Element Inspector**         | Hover tooltip with computed properties              |
| **Spacing Visualizer**        | Margin & padding box overlays                       |
| **Font Inspector**            | Typography analysis with source detection           |
| **Color Picker**              | Click to pick, palette extraction                   |
| **Pixel Ruler**               | Precise distance measurement                        |
| **Tech Detector**             | Detect frameworks & libraries                       |
| **DOM Tree Viewer**           | Walk and inspect the DOM tree with colored outlines |
| **Focus Debugger**            | Focus order visualization                           |
| **Form Debugger**             | Form validation & accessibility debugging           |
| **Z-Index Visualizer**        | Stacking context map with 3D view                   |
| **Smart Element Picker**      | Advanced element selector with XPath/CSS            |
| **Framework DevTools**        | React DevTools integration                          |
| **Container Query Inspector** | CSS container query visualization                   |
| **View Transitions Debugger** | View Transitions API debugging                      |

### CSS (10 tools)

| Tool                        | Description                        |
| --------------------------- | ---------------------------------- |
| **CSS Inspector**           | Computed CSS property viewer       |
| **CSS Editor**              | Live CSS editing                   |
| **CSS Scanner**             | Detect CSS anti-patterns           |
| **CSS Variable Inspector**  | CSS custom property viewer         |
| **Layout Visualizer**       | Flexbox/Grid overlay visualization |
| **Grid Overlay**            | CSS Grid line visualization        |
| **Contrast Checker**        | WCAG contrast compliance           |
| **Animation Inspector**     | CSS animation timeline debugger    |
| **Design System Validator** | Design token consistency checker   |
| **Breakpoint Overlay**      | Responsive breakpoint indicators   |

### Performance (4 tools)

| Tool                           | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| **Performance Entries Viewer** | Performance marks, measures, and resource timing timeline |
| **Network Analyzer**           | Network request monitoring & analysis                     |
| **Performance Budget**         | Set and monitor performance thresholds                    |
| **Scroll Animations Debugger** | Debug scroll-driven animations                            |

### Accessibility (2 tools)

| Tool                      | Description                                |
| ------------------------- | ------------------------------------------ |
| **Accessibility Audit**   | WCAG validator + ARIA checker              |
| **Focus Debugger (A11y)** | Focus order & keyboard navigation debugger |

### AI (3 tools)

| Tool                   | Description                          |
| ---------------------- | ------------------------------------ |
| **AI Analyzer**        | AI-powered page analysis             |
| **Component Analyzer** | AI-powered element analysis          |
| **Smart Suggestions**  | AI-powered suggestions with auto-fix |

### Utilities (6 tools)

| Tool                      | Description                                  |
| ------------------------- | -------------------------------------------- |
| **Command Palette**       | Quick tool access via keyboard               |
| **Responsive Preview**    | Multi-device viewport preview                |
| **Screenshot Studio**     | Capture & annotate screenshots               |
| **Site Report Generator** | Comprehensive page quality reports           |
| **Storage Inspector**     | Browse localStorage, sessionStorage, cookies |
| **Visual Regression**     | Screenshot comparison testing                |

---

## Installation

### Manual Installation (Developer Mode)

```bash
# 1. Clone the repository
git clone https://github.com/rejisterjack/frontend-dev-helper.git
cd frontend-dev-helper

# 2. Install dependencies
bun install

# 3. Build the extension
bun run build

# 4. Load in Chrome
# → Open chrome://extensions
# → Enable "Developer mode" (top right toggle)
# → Click "Load unpacked"
# → Select the .output/chrome-mv3 folder
```

---

## Keyboard Shortcuts

| Shortcut      | Action                   |
| ------------- | ------------------------ |
| `Alt+Shift+D` | Toggle DOM Outliner      |
| `Alt+Shift+I` | Toggle Element Inspector |
| `Alt+Shift+P` | Open Command Palette     |
| `Alt+Shift+0` | Disable All Tools        |

Additional shortcuts can be assigned at `chrome://extensions/shortcuts`.

---

## Development

```bash
# Start development server with hot reload
bun run dev

# Build for production
bun run build

# Build for Firefox
bun run build:firefox

# Type check
bun run compile
```

---

## Project Structure

```
frontend-dev-helper/
├── entrypoints/
│   ├── background.ts        # Service worker (message router)
│   ├── content.ts           # Content script (tool runner)
│   └── popup/               # React popup UI
├── tools/                   # Tool definitions by category
│   ├── inspection/          # 15 inspection tools
│   ├── css/                 # 10 CSS tools
│   ├── performance/         # 4 performance tools
│   ├── accessibility/       # 2 accessibility tools
│   ├── ai/                  # 3 AI tools
│   └── utilities/           # 6 utility tools
├── components/              # React components (shadcn/ui)
│   ├── layout/              # Popup shell, header, footer
│   ├── panels/              # Dashboard, settings, AI chat
│   ├── tools/               # Tool cards, grid, toggle
│   ├── command-palette/     # Command palette dialog
│   └── ui/                  # shadcn/ui primitives
├── stores/                  # Zustand state management
├── hooks/                   # React hooks
├── lib/                     # Shared utilities, types, messaging
└── content/                 # Content script infrastructure
    ├── tool-runner.ts       # Tool lifecycle manager
    ├── overlay-manager.ts   # Shadow DOM overlay system
    └── highlight-engine.ts  # Element picker/highlight
```

---

## Tech Stack

| Layer               | Technology                  |
| ------------------- | --------------------------- |
| Extension Framework | WXT (Web Extension Toolkit) |
| UI                  | React 19 + shadcn/ui        |
| Styling             | Tailwind CSS v4             |
| State Management    | Zustand                     |
| Validation          | Zod                         |
| Build               | WXT + Vite                  |
| Package Manager     | Bun                         |

---

## Security and Privacy

- **Local-first**: All tooling runs in your browser
- **Permissions**: Broad host access is required so debugging tools can run on sites you choose
- **Optional AI**: When you add an OpenRouter API key in settings, requests go to [OpenRouter](https://openrouter.ai/) only when you use AI features. No data is sent otherwise.
- **API keys**: Stored in `chrome.storage.local`, never accessible to content scripts

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) © FrontendDevHelper Contributors
