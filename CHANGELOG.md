# Changelog

All notable changes to FrontendDevHelper will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-03-19

### Added
- Initial release of FrontendDevHelper
- **DOM Outliner (Pesticide Reborn)**: Color-coded element outlines
  - 18 element types with unique colors
  - Hover labels with tag/class info
  - Per-tag visibility toggles
- **Spacing Visualizer**: Margin and padding overlays
  - Blue for padding, orange for margin
  - Pixel value display
  - Click-to-inspect interface
- **Font Inspector**: Typography analysis
  - Font family, size, weight detection
  - Line-height and letter-spacing
  - Source detection (Google Fonts, Adobe, self-hosted)
  - One-click CSS copy
- **Color Picker**: Advanced color picking
  - EyeDropper API support
  - Canvas-based fallback
  - HEX/RGB/HSL format support
  - Page palette extraction
- **Pixel Ruler**: Precision measurement
  - Horizontal and vertical measurements
  - Element-to-element distance
  - px and rem display
- **Responsive Breakpoint Overlay**
  - Viewport size display
  - Tailwind/Bootstrap breakpoint support
  - One-click resize to common devices
- **Keyboard Shortcuts**: Alt+P, Alt+S, Alt+F, Alt+C, Alt+M, Alt+B
- **Context Menu**: Right-click access to tools

### Technical
- Manifest V3 support
- React 18 + TypeScript
- Tailwind CSS styling
- Vite + CRXJS build system

## [Unreleased]

### Planned
- CSS Property Inspector
- Contrast Checker (WCAG)
- Flexbox & Grid Visualizer
- Z-Index Visualizer
- Tech Stack Detector
