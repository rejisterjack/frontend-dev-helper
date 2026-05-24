# Chrome Extension - Mini Dashboard Popup

## Overview

A beautiful, polished Chrome extension popup built with shadcn/ui components. The popup is a "Mini Dashboard" — a compact, product-quality UI that showcases shadcn's design system with no complex backend functionality.

## Tech Stack

- **WXT** — Chrome extension framework (already configured)
- **React 19** + TypeScript
- **shadcn/ui** (radix-nova style) — Component library
- **Tailwind CSS v4** — Styling
- **Geist Variable** — Font (already configured)

## Popup Layout

Dimensions: **350px wide, ~500px tall** (fixed via CSS on `html`/`body`)

### 1. Header Section

- Extension name on the left (bold text, e.g., "FDH Extension")
- Dark mode toggle on the right (Sun/Moon icon button)
- Separator line below

### 2. Quick Action Card

- Status badge: green dot + "Active" label
- Stats row: 3 compact metric blocks in a horizontal row
  - "12 Tasks" (with check icon)
  - "3 Notes" (with file-text icon)
  - "5m Focus" (with timer icon)
- Primary action button spanning full width: "Quick Add +" (with plus icon)

### 3. Feature Cards

Two compact cards stacked vertically:

**Card 1 — Recent Activity**
- Clock icon
- "Recent Activity" title
- "View your latest actions" description
- Arrow-right icon on the right side

**Card 2 — Quick Notes**
- Sticky-note icon
- "Quick Notes" title
- "Capture thoughts instantly" description
- Arrow-right icon on the right side

### 4. Footer

- Left: gear icon (settings)
- Right: "v1.0.0" version text
- Muted styling

## shadcn Components

Already installed:
- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- Button (all variants)

To install:
- Badge
- Separator

## Dark Mode

- Toggle switches the `dark` class on `document.documentElement`
- Uses existing oklch CSS variables (already defined in index.css for both `:root` and `.dark`)
- State persisted in `localStorage`

## Files to Modify

1. **`entrypoints/popup/App.tsx`** — Complete rewrite with dashboard layout
2. **`entrypoints/popup/style.css`** — Add popup dimension constraints, base styles
3. **`entrypoints/popup/main.tsx`** — Import index.css for theme variables

## Files to Create

1. None — all changes are modifications to existing popup files, plus installing 2 shadcn components

## Constraints

- No external API calls or backend
- All data is static/hardcoded (this is a UI showcase)
- Dark mode toggle is the only interactive element beyond visual hover states
- Must look polished at 350x500px (standard Chrome popup size)
