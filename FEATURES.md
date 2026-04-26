# FrontendDevHelper - Complete Feature Guide

## 🏆 Why This Is The Absolute Best

### 27 Professional Tools in One Extension

**Shortcuts:** Browsers only allow **four** built-in default shortcuts. This extension sets **Open popup (Ctrl+Shift+F)**, **Command palette (Ctrl+Shift+P)**, **DOM outliner (Alt+P)**, and **Disable all (Alt+Shift+D)**. Other keys in the table are **recommended** bindings—add them in **`chrome://extensions/shortcuts`**, or use the command palette.

| Tool | What It Does | Keyboard Shortcut |
|------|--------------|-------------------|
| 🕸️ **DOM Outliner** | Color-coded element outlines (Pesticide reborn) | Alt+P (built-in) |
| 📐 **Spacing Visualizer** | Margin & padding overlays with pixel values | Alt+S (recommended) |
| 🔤 **Font Inspector** | Typography analysis with source detection | Alt+F (recommended) |
| 🎨 **Color Picker** | EyeDropper + palette extraction | Alt+C (recommended) |
| 📏 **Pixel Ruler** | Precise distance measurement | Alt+M (recommended) |
| 📱 **Breakpoint Overlay** | Viewport size & responsive breakpoints | Alt+B (recommended) |
| 📝 **CSS Inspector** | All computed properties by category | - |
| ♿ **Contrast Checker** | WCAG AA/AAA color contrast compliance | - |
| ⊞ **Layout Visualizer** | Flexbox & Grid visualization | - |
| 📚 **Z-Index Visualizer** | Stacking order with **3D view** | - |
| 🔍 **Tech Detector** | Framework & library detection | - |
| 🛡️ **Accessibility Audit** | WCAG validator + ARIA checker | - |
| 📊 **Site Report Generator** | **Comprehensive site analysis** | - |
| ✏️ **Live CSS Editor** | **Edit CSS in real-time** | - |
| 📸 **Screenshot Studio** | **Capture & annotate screenshots** | - |
| 🎬 **Animation Inspector** | **Debug CSS animations** | - |
| 📲 **Responsive Preview** | **Multi-device side-by-side** | - |
| 🎨 **Design System Validator** | **Check design token consistency** | - |
| 🌐 **Network Analyzer** | **Monitor requests & waterfall** | - |
| ⌨️ **Command Palette** | **Quick access to all tools** | Ctrl+Shift+P (built-in) |
| 💾 **Storage Inspector** | **Inspect LocalStorage, IndexedDB, Cookies** | - |
| ✨ **AI Suggestions** | **Smart analysis with auto-fixes** | - |
| 🌳 **Component Tree** | **React/Vue/Angular/Svelte visualization** | - |
| 🔥 **Performance Flame Graph** | **JS execution profiling** | - |
| 🎯 **Focus Debugger** | **Visualize focus order & traps** | - |
| 📝 **Form Debugger** | **Debug forms & validation** | - |
| 👁️ **Visual Regression** | **Screenshot comparison testing** | - |

---

## 🎯 Feature Highlights

### DOM Outliner (Pesticide Reborn)
- **18 element types** with unique colors
- Hover labels showing tag name, ID, and classes
- Per-tag visibility toggles
- Zero layout impact (uses outline, not border)

### Spacing Visualizer
- Click any element to analyze
- **Blue overlay** = padding
- **Orange overlay** = margin
- Exact pixel values displayed
- Works with nested elements

### Font Inspector
- Hover any text to analyze
- Font family, size, weight, line-height
- **Source detection**: Google Fonts, Adobe Typekit, self-hosted
- One-click CSS copy

### Color Picker
- **EyeDropper API** support (Chrome 95+)
- Canvas-based fallback for Firefox
- HEX, RGB, HSL formats
- **Complete page palette extraction** with harmonies
- Export palette as JSON
- Color harmonies: complementary, analogous, triadic, tetradic, monochromatic
- Semantic color categorization

### Pixel Ruler
- Click & drag measurement
- Element-to-element distance
- **px and rem** display
- Arrow endpoints
- ESC to cancel

### Responsive Breakpoint Overlay
- Persistent viewport size badge
- **Tailwind** & **Bootstrap** breakpoints
- One-click resize to devices:
  - Mobile (375px)
  - Tablet (768px)
  - Laptop (1440px)
  - Desktop (1920px)

### CSS Inspector
- **11 categories**: Layout, Box Model, Typography, Background, Border, Flexbox, Grid, Transform, Transition, Animation, Other
- Filter by category
- Show/hide inherited properties
- **Contrast ratio** display
- One-click CSS copy

### Contrast Checker
- Pick foreground & background colors
- **WCAG AA/AAA** compliance ratings
- Pass/Fail indicators
- **Suggestions** for improvement
- Live preview

### Flexbox & Grid Visualizer
- **Main axis** line (purple)
- **Cross axis** line (pink)
- Gap indicators with pixel values
- Item numbers and properties
- Grid track numbers

### Z-Index Visualizer
- Stacking order hierarchy
- **Z-index conflicts** detection
- Stacking context reasons
- Grouped by z-index value
- Visual overlay mode
- **🥽 3D Stack View** - Interactive 3D visualization with drag-to-rotate
- Drag, zoom, and wireframe modes

### Tech Detector
Detects **20+ technologies**:
- **Frameworks**: React, Vue, Angular, Svelte, Next.js, Nuxt
- **CSS**: Tailwind, Bootstrap, Material UI, Styled Components, Emotion
- **Analytics**: Google Analytics, GTM, Segment, Mixpanel, Hotjar
- **CMS**: WordPress, Shopify, Webflow
- **Build Tools**: Vite, Webpack
- **Fonts**: Google Fonts, Font Awesome

### Accessibility Audit 🛡️
Comprehensive WCAG 2.1 compliance checker:
- **ARIA Validation**: 70+ valid roles, deprecated role detection
- **Focus Order Visualization**: Tab order with numbered overlays
- **Color Contrast Analysis**: WCAG AA/AAA compliance per element
- **Alt Text Detection**: Missing alt attributes on images
- **Form Label Validation**: Proper label associations
- **Keyboard Navigation**: Detect mouse-only interactions
- **Issue categorization**: Errors, warnings, and info levels
- **Export audit reports** as JSON

### Site Report Generator 📊
**The ultimate all-in-one analysis tool:**
- **Overall Site Score** (0-100) based on 4 key areas
- **Performance Analysis**:
  - Core Web Vitals with ratings
  - Navigation timing breakdown
  - Resource analysis & optimization
  - Image optimization opportunities
  - Memory usage tracking
- **Accessibility Audit**:
  - WCAG compliance scoring
  - All accessibility issues categorized
  - Contrast ratio analysis
- **SEO Analysis**:
  - Meta tags validation
  - Heading hierarchy check
  - Image alt text audit
  - Mobile-friendliness check
  - Structured data detection
  - Content analysis (word count, reading time)
- **Color Palette Analysis**:
  - Dominant colors extraction
  - Color harmonies generation
  - Semantic color categorization
- **Tech Stack Detection**:
  - Frameworks, libraries, CMS
  - Analytics tools
  - Build tools & fonts
- **Best Practices Check**:
  - HTTPS validation
  - Deprecated APIs/elements
  - Doctype & charset validation
- **Smart Recommendations**:
  - Priority-based suggestions
  - Impact & effort estimation
  - Actionable advice
- **Export Options**:
  - Beautiful HTML reports
  - Print-ready PDF
  - JSON for further analysis

### Live CSS Editor ✏️
Edit CSS in real-time with instant preview:
- **Click any element** to select and edit
- **Categorized properties**: Layout, Typography, Colors, Flexbox, Effects
- **Smart inputs**: Color pickers, dropdowns, sliders
- **Live preview** changes instantly
- **Undo/Redo** history (Ctrl+Z / Ctrl+Y)
- **Copy modified CSS** for export
- **Reset** to original styles

### Screenshot Studio 📸
Capture and annotate screenshots:
- **Viewport or full page** capture
- **Annotation tools**: Arrows, rectangles, circles, text, blur
- **Edit annotations**: Move, resize, delete
- **Color picker** for annotations
- **Export**: Copy to clipboard, download PNG/JPG
- **Keyboard shortcuts** for quick tool switching

### Animation Inspector 🎬
Debug CSS animations and transitions:
- **Detect all animations** on the page
- **Timeline visualization** with progress
- **Play/Pause** individual or all animations
- **Speed control**: 0.25x, 0.5x, 1x, 2x
- **Animation details**: duration, delay, easing, keyframes
- **Highlight animated elements**

### Responsive Preview 📲
Multi-device preview side-by-side:
- **Device presets**: Mobile (375px), Tablet (768px), Laptop (1440px), Desktop (1920px)
- **Custom dimensions** input
- **Sync scrolling** between previews
- **Rotate devices** (portrait/landscape)
- **Visual device frames**
- **Global scale** slider to fit screen

### Design System Validator 🎨
Check design token consistency:
- **Validate spacing**: Check against 4px, 8px, 16px grid
- **Color consistency**: Match design system palette
- **Typography validation**: Font sizes, weights, line heights
- **Border radius** consistency
- **Shadow validation**
- **Built-in presets**: Tailwind, Material Design, Bootstrap
- **Custom tokens** configuration
- **Visual highlighting** of violations

### Network Analyzer 🌐
Monitor network requests and performance:
- **Request waterfall** timeline
- **Timing breakdown**: DNS, Connect, TLS, TTFB, Download
- **Categorization**: JS, CSS, Images, API, Fonts, Media
- **Size & status** tracking
- **Render-blocking** resource detection
- **Filter & search** by type or URL
- **Export HAR** format

---

## 🆕 "Best of the Best" Features

### Command Palette ⌨️
VS Code-style quick access to all tools:
- **Fuzzy search** all 27 tools instantly
- **Keyboard navigation** (arrows, enter, escape)
- **Recent commands** history
- **Categorized results**: Tools, Actions, Settings, Navigation
- **Global shortcut**: Ctrl+Shift+P / Cmd+Shift+P

### Storage Inspector 💾
Complete storage debugging and management:
- **LocalStorage**: View, edit, delete items with JSON validation
- **SessionStorage**: Real-time session data inspection
- **IndexedDB**: Database browser with store and record views
- **Cookies**: View all cookies with secure/httpOnly flags
- **Cache Storage**: Service Worker cache inspection
- **Storage quota**: Usage tracking and limits
- **Export**: Download complete storage snapshot as JSON

### AI Suggestions ✨
Smart analysis with one-click fixes:
- **50+ detection patterns** across 6 categories
- **Accessibility**: Alt text, labels, contrast, focus order
- **Performance**: DOM size, image optimization, lazy loading
- **SEO**: Meta tags, headings, structured data
- **Best Practices**: Security, deprecated elements
- **Auto-fixes**: One-click repairs for common issues
- **Confidence scoring**: Know which suggestions to trust

### Component Tree 🌳
Framework component hierarchy visualization:
- **Auto-detection**: React, Vue, Angular, Svelte
- **Component tree**: Hierarchical view with expand/collapse
- **Props inspection**: View component properties
- **State viewing**: See reactive state values
- **Component highlighting**: Click to highlight in DOM
- **Real-time updates**: Syncs with application changes

### Performance Flame Graph 🔥
JavaScript execution profiling:
- **Long task detection**: Find performance bottlenecks (>50ms)
- **Execution timeline**: Visual representation of JS calls
- **Zoom & pan**: Navigate complex profiles
- **Filter by type**: Script, layout, paint, composite
- **Duration filtering**: Focus on slow operations
- **Export**: Save profiles for later analysis

### Focus Debugger 🎯
Accessibility focus order visualization:
- **Focus order display**: Numbered badges on focusable elements
- **Focus trap detection**: Identify problematic navigation
- **Focus history**: Track last 50 focus events
- **Tab index analysis**: Visualize tab order issues
- **Current focus highlight**: See what's focused now
- **Keyboard-only testing**: Validate accessibility

### Form Debugger 📝
Comprehensive form analysis:
- **Form overview**: All forms with validation status
- **Field analysis**: Input types, constraints, values
- **Label detection**: Explicit, implicit, ARIA labels
- **Autofill detection**: Identify browser autofill fields
- **Validation messages**: Real-time error display
- **Accessibility issues**: Missing labels, required fields

### Visual Regression 👁️
Screenshot comparison testing:
- **Baseline capture**: Save reference screenshots
- **Pixel-perfect diff**: Highlight visual changes
- **Configurable threshold**: Adjust sensitivity (default 0.1%)
- **Ignore regions**: Exclude dynamic content areas
- **Approval workflow**: Accept or reject changes
- **Batch testing**: Test multiple pages at once
- **Export diffs**: Download comparison images

---

## 🛡️ Quality Features

### Error Handling
- **Error Boundary** catches React crashes
- Graceful error display
- Reload and reset options
- GitHub issue reporting link

### Keyboard Shortcuts
**Built-in defaults (4, manifest limit):** `Ctrl+Shift+F` (popup), `Ctrl+Shift+P` (command palette), `Alt+P` (DOM outliner), `Alt+Shift+D` (disable all).

**Common bindings to add under `chrome://extensions/shortcuts`:** `Alt+S`, `Alt+F`, `Alt+C`, `Alt+M`, `Alt+B` for the tools in the table above, and any other command from the list.

### Export & Share
Generate comprehensive reports:
- **Export as JSON** - Complete page analysis
- **Export as PDF** - Styled printable report
- **Export as Markdown** - Documentation-ready
- **Screenshot capture** with annotations
- **Shareable links** for collaboration
- Performance metrics included

### Privacy First
- **Zero data collection**
- All processing happens locally
- No external servers
- No analytics or tracking

### Professional Build
- **Manifest V3** compliant
- TypeScript strict mode
- **85 modules**, ~25,000+ lines of code
- Automated CI/CD with GitHub Actions
- Playwright E2E tests

---

## 📊 Comparison with Alternatives

| Feature | FrontendDevHelper | Pesticide | VisBug | Other Extensions |
|---------|------------------|-----------|--------|------------------|
| DOM Outliner | ✅ Advanced | ✅ Basic | ✅ | ⚠️ Separate ext |
| Spacing Visualizer | ✅ Built-in | ❌ | ✅ | ⚠️ Separate ext |
| Font Inspector | ✅ + Source detection | ❌ | ⚠️ Limited | ⚠️ Separate ext |
| Color Picker | ✅ + Palette | ❌ | ✅ | ⚠️ Separate ext |
| Pixel Ruler | ✅ px + rem | ❌ | ✅ | ⚠️ Separate ext |
| Breakpoint Overlay | ✅ Tailwind/Bootstrap | ❌ | ❌ | ⚠️ Separate ext |
| CSS Inspector | ✅ 11 categories | ❌ | ⚠️ Limited | ❌ |
| Contrast Checker | ✅ WCAG AA/AAA | ❌ | ⚠️ Basic | ⚠️ Separate ext |
| Layout Visualizer | ✅ Flex + Grid | ❌ | ⚠️ Limited | ❌ |
| Z-Index Visualizer | ✅ Stacking context + 3D view | ❌ | ❌ | ❌ |
| Tech Detector | ✅ 20+ technologies | ❌ | ❌ | ⚠️ Separate ext |
| Accessibility Audit | ✅ WCAG + ARIA validator | ❌ | ❌ | ⚠️ Separate ext |
| Site Report | ✅ All-in-one analysis | ❌ | ❌ | ⚠️ Separate ext |
| Live CSS Editor | ✅ Real-time editing | ❌ | ⚠️ Limited | ⚠️ Separate ext |
| Screenshot Studio | ✅ Annotations & capture | ❌ | ❌ | ⚠️ Separate ext |
| Animation Inspector | ✅ Timeline debugging | ❌ | ❌ | ❌ |
| Responsive Preview | ✅ Multi-device | ❌ | ❌ | ⚠️ Separate ext |
| Design System Validator | ✅ Token consistency | ❌ | ❌ | ❌ |
| Network Analyzer | ✅ Waterfall view | ❌ | ❌ | ⚠️ Separate ext |
| Command Palette | ✅ Quick access | ❌ | ❌ | ❌ |
| Storage Inspector | ✅ Complete storage debugging | ❌ | ❌ | ⚠️ Separate ext |
| AI Suggestions | ✅ Smart analysis + fixes | ❌ | ❌ | ❌ |
| Component Tree | ✅ Framework visualization | ❌ | ❌ | ⚠️ Separate ext |
| Performance Flame Graph | ✅ JS profiling | ❌ | ❌ | ❌ |
| Focus Debugger | ✅ Accessibility debugging | ❌ | ❌ | ❌ |
| Form Debugger | ✅ Form validation analysis | ❌ | ❌ | ❌ |
| Visual Regression | ✅ Screenshot comparison | ❌ | ❌ | ⚠️ Separate ext |
| Export & Reports | ✅ JSON/PDF/Markdown | ❌ | ❌ | ❌ |
| **Total Extensions Needed** | **1** | **12+** | **8+** | **20+** |

---

## 🚀 Installation

### Chrome / Brave / Edge
1. Download `frontend-dev-helper-chrome.zip` from releases
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extracted folder

### Firefox
1. Download `frontend-dev-helper-firefox.zip` from releases
2. Open `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the manifest.json file

---

## 📝 License

MIT License - See [LICENSE](LICENSE)

---

**Made with ❤️ for frontend developers worldwide**
