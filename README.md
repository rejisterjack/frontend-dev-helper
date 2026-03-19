# FrontendDevHelper 🛠️

A powerful browser extension for frontend developers with essential dev tools, color picker, layout inspector, and more.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-orange.svg)

## Features ✨

- 🔍 **Element Inspector** - Hover and click to inspect any element on the page
- 🎨 **Color Picker** - Pick colors from anywhere with a magnifying glass
- 📏 **Measure Tool** - Measure distances between elements with precision
- ⊞ **Grid Overlay** - Toggle customizable grid overlays for alignment
- 📋 **CSS/HTML Copy** - Copy computed CSS and HTML with one click
- ⚡ **Keyboard Shortcuts** - Quick access with customizable hotkeys

## Tech Stack 🚀

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite with CRXJS
- **Styling**: Tailwind CSS
- **Testing**: Vitest
- **Icons**: React Icons

## Installation 📦

### Development

```bash
# Clone the repository
git clone https://github.com/frontend-dev-helper/frontend-dev-helper.git
cd frontend-dev-helper

# Install dependencies
npm install

# Start development server
npm run dev

# Load extension in Chrome:
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the `dist` folder
```

### Build for Production

```bash
# Build the extension
npm run build

# The `dist` folder will contain the production build
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Project Structure 📁

```
frontend-dev-helper/
├── public/
│   ├── manifest.json          # Extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── popup/                 # Popup UI
│   │   ├── index.tsx          # Entry point
│   │   └── App.tsx            # Main app component
│   ├── background/            # Service worker
│   │   └── index.ts           # Background script
│   ├── content/               # Content scripts
│   │   ├── index.ts           # Main content script
│   │   ├── inspector.ts       # Element inspector
│   │   ├── color-picker.ts    # Color picker tool
│   │   ├── measure-tool.ts    # Measure tool
│   │   ├── grid-overlay.ts    # Grid overlay
│   │   └── styles.css         # Content script styles
│   ├── types/
│   │   └── messages.ts        # Message type definitions
│   ├── hooks/
│   │   ├── useStorage.ts      # Storage hook
│   │   └── useTabInfo.ts      # Tab info hook
│   ├── styles/
│   │   └── globals.css        # Global styles
│   └── test/
│       └── setup.ts           # Test setup
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── vitest.config.ts
```

## Usage 🎮

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+F` | Open popup |
| `Ctrl+Shift+I` | Toggle inspector |

### Context Menu

Right-click anywhere on a page to access:
- 🔍 Inspect Element
- 🎨 Pick Color
- 📏 Measure Distance
- 📋 Copy CSS/HTML
- ⊞ Toggle Grid Overlay

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for frontend developers
