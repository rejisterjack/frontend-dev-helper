# Changelog

All notable changes to FrontendDevHelper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-03-19 - 🚀 THE ABSOLUTE BEST RELEASE

### Added - Making It The Absolute Best

#### 🛡️ 12th Tool: Accessibility Audit
- **Complete WCAG 2.1 compliance checker**
- ARIA validation with 70+ valid roles
- Deprecated role detection
- Focus order visualization with numbered overlays
- Color contrast analysis per element
- Alt text detection for images
- Form label validation
- Keyboard navigation testing
- Issue categorization: errors, warnings, info
- Export audit reports as JSON

#### 📊 Enhanced Performance Tab
- **Core Web Vitals monitoring**: LCP, FID, CLS, FCP, TTFB, INP
- Navigation timing breakdown with TLS handshake
- Resource analysis by type
- Image optimization recommendations
- Render blocking resource detection
- Memory usage visualization
- Collapsible sections for better organization

#### 📤 Export & Share System
- **Export reports as JSON** - Complete page analysis
- **Export as PDF** - Styled printable reports
- **Export as Markdown** - Documentation-ready format
- **Screenshot capture** with annotation support
- **Shareable links** for collaboration
- Performance metrics included in exports

#### 🎨 Complete Color Palette Extraction
- Automatic page color extraction
- **Color harmonies generation**:
  - Complementary colors
  - Analogous colors
  - Triadic colors
  - Split complementary
  - Tetradic colors
  - Monochromatic shades
- **Semantic color categorization**:
  - Primary, secondary, accent colors
  - Neutral colors
  - Semantic colors (success, warning, error, info)
- Export palette as JSON
- Visual palette overlay with copy-to-clipboard

#### 🥽 3D Z-Index Visualizer
- **Interactive 3D stacking view**
- Drag to rotate the view
- Scroll to zoom in/out
- Wireframe mode toggle
- Visual stacking order representation
- Real-time layer information
- Reset view functionality

#### 👋 Onboarding Flow
- Multi-step welcome tour
- Tool overview with descriptions
- Keyboard shortcuts showcase
- First-time user guidance
- Skip option for experienced users
- Persistent completion state

### Enhanced
- **Z-Index Visualizer**: Added 3D view button to main overlay
- **Color Picker**: Complete palette extraction implementation
- **Performance Tab**: Comprehensive metrics and recommendations
- **Popup UI**: Added Accessibility Audit tool card

### Technical
- 3 new content script modules
- Enhanced TypeScript types for all new features
- Comprehensive test coverage for new modules
- Updated documentation with all new features

## [1.0.0] - 2024-03-19

### Added
- Initial release of FrontendDevHelper with 11 development tools
- **DOM Outliner (Pesticide Reborn)**: Color-coded element outlines
  - 18 element types with unique colors
  - Hover labels with tag/class info
  - Per-tag visibility toggles
  - Keyboard shortcut: Alt+P
- **Spacing Visualizer**: Margin and padding overlays
  - Blue for padding, orange for margin
  - Pixel value display
  - Click-to-inspect interface
  - Keyboard shortcut: Alt+S
- **Font Inspector**: Typography analysis
  - Font family, size, weight detection
  - Line-height and letter-spacing
  - Source detection (Google Fonts, Adobe, self-hosted)
  - One-click CSS copy
  - Keyboard shortcut: Alt+F
- **Color Picker**: Advanced color picking
  - EyeDropper API support
  - Canvas-based fallback
  - HEX/RGB/HSL format support
  - Page palette extraction
  - Keyboard shortcut: Alt+C
- **Pixel Ruler**: Precision measurement
  - Horizontal and vertical measurements
  - Element-to-element distance
  - px and rem display
  - Keyboard shortcut: Alt+M
- **Responsive Breakpoint Overlay**
  - Viewport size display
  - Tailwind/Bootstrap breakpoint support
  - One-click resize to common devices
  - Keyboard shortcut: Alt+B
- **CSS Inspector**: View all computed CSS properties by category
  - Box model visualization
  - Computed styles breakdown
  - CSS property categorization
  - Copy CSS to clipboard
- **Contrast Checker**: WCAG AA/AAA color contrast compliance
  - Automatic contrast ratio calculation
  - WCAG compliance indicators
  - Suggestions for accessible colors
- **Flex/Grid Visualizer**: Visualize flexbox and grid layouts
  - Flex container highlighting
  - Grid cell visualization
  - Gap and alignment indicators
- **Z-Index Visualizer**: See stacking order and z-index hierarchy
  - 3D stacking context view
  - Z-index value display
  - Visual depth representation
- **Tech Detector**: Detect frameworks, libraries, and tools
  - Automatic framework detection
  - Library version identification
  - Technology stack summary
- **Keyboard Shortcuts**: Alt+P, Alt+S, Alt+F, Alt+C, Alt+M, Alt+B
- **Context Menu**: Right-click access to tools
- **Options Page**: Full settings interface with theme and shortcut configuration

### Technical
- Manifest V3 support
- React 18 + TypeScript
- Tailwind CSS styling
- Vite + CRXJS build system
- Service worker for background tasks
- Content script for page interaction
