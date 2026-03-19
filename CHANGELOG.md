# Changelog

All notable changes to FrontendDevHelper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
