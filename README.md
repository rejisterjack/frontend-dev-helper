# 🔬 FrontendDevHelper — Frontend Developer Toolkit Extension

> **One extension. Every visual debugging tool you actually need.**
> Built for Chrome, Brave & Firefox · Manifest V3 · Open Source

![FrontendDevHelper Banner](https://img.shields.io/badge/status-in%20development-yellow?style=for-the-badge)
![Manifest V3](https://img.shields.io/badge/manifest-v3-blue?style=for-the-badge)
![License MIT](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)

---

## 🧠 Why FrontendDevHelper Exists

Frontend developers rely on 8–12 separate browser extensions just to do basic visual debugging — layout inspection, font identification, color picking, spacing measurement, and more. Most of those extensions were built on **Manifest V2** and are now **broken or abandoned** on modern Chrome, Brave, and Firefox.

The most beloved of them all — **Pesticide** — which draws outlines around every DOM element to help developers see layout structure, hasn't been properly maintained for the latest browser versions. Developers still need it, badly. And they need everything else too.

**FrontendDevHelper is the unified, modern replacement.**

Built on Manifest V3 from day one. Works across Chrome, Brave, and Firefox. Open source. No trackers. No paywalls.

---

## ✨ Features

### 🟢 Phase 1 — Available Now (MVP)

#### 🐛 Pesticide Reborn — DOM Layout Visualizer
The feature that started it all, completely rebuilt.

- Draws colored outlines around **every DOM element** to reveal layout structure
- **Color-coded by element type** — `<div>`, `<section>`, `<p>`, `<img>`, `<button>`, etc. each get a distinct color
- **Hover labels** — shows the tag name and class on hover, so you instantly know what you're looking at
- Toggle **per-tag-type visibility** — hide paragraph outlines and focus only on layout containers
- Works on `localhost`, staging, and production
- **Zero impact on backgrounds or colors** — outlines only, nothing breaks your visual design

```
Old Pesticide: Broken on Chrome 100+, Brave, Firefox
FrontendDevHelper: Works everywhere, Manifest V3, actively maintained
```

#### 📐 Spacing Visualizer
- Click any element to see its **margin and padding rendered as color overlays** — exactly like Figma's spacing view
- Blue = padding, Orange = margin (matches the DevTools mental model)
- Shows computed pixel values on the overlay itself
- No more hunting through the computed styles panel

---

### 🟡 Phase 2 — In Progress

#### 🔤 Font Inspector
Hover any text on any page and instantly see:
- Font family & fallback stack
- Font size, weight, line-height, letter-spacing
- Whether it's a Google Font, Adobe Typekit, or self-hosted
- One-click copy of the CSS rule

No more opening DevTools, clicking the element, scrolling through computed styles, and cross-referencing the network panel.

#### 🎨 Color Picker + Palette Extractor
- **Eyedropper** — pick any color from anywhere on the page
- Copies in your preferred format: HEX, RGB, RGBA, or HSL
- **Page Palette** — extract the full color palette of any website in one click, exported as a grid
- Great for design audits, client reviews, and inspiration

#### 📏 Pixel Ruler & Measurement Tool
- Draw ruler lines across the page
- Measure the **distance between any two elements** in `px` and `rem`
- Designed for pixel-perfect implementation from Figma/Zeplin specs

#### 📱 Responsive Breakpoint Overlay
- A persistent badge showing the **current viewport width in px**
- Highlights which **Tailwind / Bootstrap / custom breakpoint** is currently active
- One-click resize to standard device widths

---

### 🔵 Phase 3 — Planned

| Feature | Description |
|---|---|
| **CSS Property Inspector** | Hover any element → popup with all computed CSS, one-click copy |
| **Contrast Checker** | Pick foreground + background, instantly see WCAG AA/AAA compliance rating |
| **Flexbox & Grid Visualizer** | Overlay axes, tracks, and gaps on any flex/grid container |
| **Z-Index Visualizer** | See the stacking order of all positioned elements — the spiritual revival of Firefox's old 3D DOM view |
| **Tech Stack Detector** | Identify framework, CSS library, fonts, analytics tools used on any site |
| **Shadow DOM Inspector** | Reveal and inspect Shadow DOM trees hidden from regular DevTools |

---

## 📸 Screenshots

> _Screenshots and demo GIFs will be added as features ship._

---

## 🚀 Getting Started

### Install from Chrome Web Store _(coming soon)_
> The extension will be available on the Chrome Web Store, Firefox Add-ons, and the Brave extensions store once v1.0 ships.

### Install Manually (Developer Mode)

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/FrontendDevHelper.git
cd FrontendDevHelper

# 2. Install dependencies
npm install

# 3. Build the extension
npm run build

# 4. Load in Chrome / Brave
# → Open chrome://extensions
# → Enable "Developer mode" (top right toggle)
# → Click "Load unpacked"
# → Select the /dist folder

# 5. Load in Firefox
# → Open about:debugging
# → Click "This Firefox"
# → Click "Load Temporary Add-on"
# → Select any file inside /dist
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Extension Architecture | Chrome Manifest V3 |
| UI Framework | React + TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite + CRXJS |
| Cross-browser | WebExtensions API |
| Testing | Vitest + Playwright |

---

## 📁 Project Structure

```
FrontendDevHelper/
├── public/
│   └── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.ts  # MV3 service worker
│   ├── content/
│   │   ├── pesticide.ts       # DOM outliner logic
│   │   ├── spacing.ts         # Spacing visualizer logic
│   │   ├── font-inspector.ts  # Font identification
│   │   └── color-picker.ts    # Color eyedropper
│   ├── popup/
│   │   ├── Popup.tsx          # Main popup UI
│   │   └── components/        # Popup UI components
│   ├── panel/                 # DevTools panel (Phase 2)
│   └── utils/
│       ├── dom.ts             # DOM utility helpers
│       └── color.ts           # Color format converters
├── dist/                      # Built extension output
└── tests/                     # Unit & e2e tests
```

---

## 🧩 How Each Feature Works (Technical Notes)

### DOM Outliner (Pesticide Reborn)
Injects a content script that applies CSS `outline` rules to all elements via a dynamically injected `<style>` tag. Uses CSS attribute selectors to color-code by tag name. Outline (not border) is used so it doesn't affect layout or box model. Controlled via `chrome.storage.session` for toggle state persistence.

### Spacing Visualizer
Uses `window.getComputedStyle()` on the clicked element to read margin and padding values. Renders four color-coded overlay `<div>` elements positioned absolutely around the target element using `getBoundingClientRect()`. Cleans up overlays on click-away or tool deactivation.

### Font Inspector
On hover, reads `font-family`, `font-size`, `font-weight`, `line-height`, and `letter-spacing` from computed styles. Cross-references loaded stylesheets and network requests to determine font source (Google Fonts URL pattern matching, Typekit domain detection, etc.).

### Color Picker
Uses the native **EyeDropper API** (`new EyeDropper().open()`) where available (Chrome 95+), with a canvas-based fallback for Firefox. Converts the returned sRGB hex to HSL, RGBA on demand using color math utilities.

---

## 🗺️ Roadmap

| Version | Features | Status |
|---|---|---|
| `v0.1.0` | DOM Outliner (Pesticide Reborn) | 🔨 In Development |
| `v0.2.0` | Spacing Visualizer | 📋 Planned |
| `v0.3.0` | Font Inspector + Color Picker | 📋 Planned |
| `v0.4.0` | Pixel Ruler + Responsive Breakpoint Overlay | 📋 Planned |
| `v1.0.0` | Chrome Web Store launch | 📋 Planned |
| `v1.1.0` | CSS Property Inspector + Contrast Checker | 📋 Planned |
| `v1.2.0` | Flexbox/Grid Visualizer + Z-Index Viewer | 📋 Planned |
| `v2.0.0` | Full DevTools Panel integration | 💭 Exploring |

---

## 🤝 Contributing

Contributions are welcome and appreciated! FrontendDevHelper is intentionally designed to be a community-maintained open-source toolkit, not a closed product.

### How to Contribute

```bash
# Fork the repo and create a feature branch
git checkout -b feature/my-new-tool

# Make your changes, write tests
npm run test

# Submit a pull request with a clear description of the problem and solution
```

### Contribution Ideas
- 🐛 Bug fixes and browser compatibility patches
- 🌐 Firefox / Safari compatibility improvements
- 🎨 New visual debugging tools
- ♿ Accessibility improvements to the extension UI itself
- 📖 Documentation and tutorials
- 🌍 Internationalization (i18n)

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a PR.

---

## ❓ FAQ

**Why not just use Chrome DevTools?**
DevTools is powerful but requires multiple clicks and tab-switching for tasks FrontendDevHelper does in a single hover or click. FrontendDevHelper is optimized for speed — it's the difference between a keyboard shortcut and navigating a menu.

**Does FrontendDevHelper collect any data?**
No. Zero analytics, zero telemetry, zero data collection of any kind. All operations happen locally in your browser. See [PRIVACY.md](./PRIVACY.md).

**Why is Pesticide broken on my browser?**
The original Pesticide extension was built on Manifest V2, which Chrome deprecated and began blocking in 2024. FrontendDevHelper is built from the ground up on Manifest V3, the current standard for all browsers.

**Will this work on Firefox?**
Yes — Firefox compatibility is a first-class goal, not an afterthought. Firefox supports the WebExtensions API (the standard that MV3 is based on), and FrontendDevHelper is tested on Firefox throughout development.

**I want Feature X — where do I ask?**
Open a [GitHub Issue](https://github.com/YOUR_USERNAME/FrontendDevHelper/issues) with the label `feature-request`. If it solves a real developer pain point, it'll likely make the roadmap.

---

## 📜 License

MIT — free to use, fork, and build on. See [LICENSE](./LICENSE) for details.

---

## 👤 Author

**Your Name**
Frontend Developer · Open Source Enthusiast

- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Portfolio: [yourportfolio.com](https://yourportfolio.com)
- Twitter/X: [@YOUR_HANDLE](https://twitter.com/YOUR_HANDLE)

---

## 🌟 If This Helps You

If FrontendDevHelper saves you time, consider giving it a ⭐ on GitHub — it helps other developers find the project and motivates continued development.

---

> _Built out of frustration with broken tools and too many extensions. Made with care for the frontend community._