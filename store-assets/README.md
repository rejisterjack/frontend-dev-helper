# Chrome Web Store Assets

This directory contains all assets required for Chrome Web Store submission.

## Required Assets

### Screenshots (1280x800 or 640x400)
- [ ] Screenshot 1: Popup Overview (Tools tab with categories)
- [ ] Screenshot 2: DevTools Panel (Element inspector with computed styles)
- [ ] Screenshot 3: CSS Variable Inspector
- [ ] Screenshot 4: Smart Element Picker with unified panel
- [ ] Screenshot 5: Responsive Testing Report
- [ ] Screenshot 6: Dashboard - Sessions Overview

### Promotional Images
- [ ] Small Promo (440x280) - Feature highlight
- [ ] Large Promo (920x680) - Full feature showcase
- [ ] Marquee (1400x560) - Wide banner for store listing

### Demo Video
- [ ] 30-60 second demo video showing key features
- [ ] Format: MP4, max 100MB

## Asset Generation

### Screenshot Guidelines
1. Use clean, high-contrast backgrounds
2. Show real-world usage examples
3. Include the extension icon in action
4. Highlight key features with subtle annotations

### Recommended Screenshots Content

1. **Popup Overview**
   - Show the tabbed interface
   - Highlight categorized tools
   - Include keyboard shortcut badges

2. **DevTools Panel**
   - Element selection mode
   - Computed styles view
   - Box model visualization

3. **CSS Variable Inspector**
   - Color palette view
   - Edit mode active
   - Export options visible

4. **Smart Element Picker**
   - Unified inspection panel
   - WCAG badges visible
   - Element highlighting

5. **Responsive Testing**
   - Side-by-side breakpoint comparison
   - Issue indicators
   - Device frames

6. **Dashboard**
   - Stats overview
   - Activity feed
   - Tool usage chart

## Asset Naming Convention
```
screenshots/
  screenshot-1-popup-tools.png          (1280x800)
  screenshot-2-devtools-panel.png       (1280x800)
  screenshot-3-css-inspector.png        (1280x800)
  screenshot-4-element-picker.png       (1280x800)
  screenshot-5-responsive-testing.png   (1280x800)
  screenshot-6-dashboard.png            (1280x800)

promotional/
  promo-small.png                       (440x280)
  promo-large.png                       (920x680)
  promo-marquee.png                     (1400x560)

video/
  demo-video.mp4                        (Max 100MB)
```

## Using the HTML Generator

Run the following to generate placeholder screenshots:

```bash
# Generate screenshot HTML pages
npm run generate:screenshots

# Capture screenshots using Playwright
npm run capture:screenshots
```

## Design Guidelines

### Colors
- Primary: #3B82F6 (Blue 500)
- Secondary: #8B5CF6 (Purple 500)
- Background: #F8FAFC (Slate 50)
- Text: #0F172A (Slate 900)

### Typography
- Font: Inter, -apple-system, BlinkMacSystemFont, sans-serif
- Headings: 600 weight
- Body: 400 weight

### Chrome Store Listing Copy

**Title:** FrontendDevHelper - All-in-One Frontend Toolkit

**Summary:** 18+ powerful tools for frontend developers. Inspect, debug, analyze, and optimize your web apps.

**Description:**
FrontendDevHelper is a comprehensive browser extension designed for modern frontend developers. It combines 18+ essential development tools into one seamless experience.

Key Features:
• DOM Outliner - Visualize page structure with ease
• CSS Variable Inspector - Detect, edit, and export CSS custom properties
• Smart Element Picker - Unified inspection panel for CSS, spacing, fonts, and more
• Responsive Testing - Auto-capture screenshots at multiple breakpoints
• Session Recording - Record and replay debugging sessions
• Performance Budget - Track Core Web Vitals with alerts
• Multi-Framework Support - React, Vue, Angular, Svelte detection
• Cross-Tab Sync - Global or per-tab tool state management
• Dashboard - Historical tracking and team collaboration

Perfect for:
- Frontend developers
- UI/UX designers
- QA engineers
- Performance engineers

Privacy-focused: All processing happens locally. No data leaves your browser.

**Category:** Developer Tools

**Language:** English (US)

**Non-trader Note:** This developer has not identified itself as a trader. For consumers in the European Union, please note that consumer rights do not apply to contracts between you and this developer.

**Support URL:** https://github.com/yourusername/frontend-dev-helper/issues

**Privacy Policy:** See PRIVACY.md

## Monetization Setup

### Pricing Tiers
- Free: Core tools (5 AI analyses/day)
- Pro ($4.99/month): Unlimited AI, priority support
- Team ($19.99/month): Collaboration features, admin panel

### License Server
- URL: https://api.frontenddevhelper.com/v1/license
- Validation: JWT-based
- Grace period: 7 days

See `/monetization/` for server implementation.
