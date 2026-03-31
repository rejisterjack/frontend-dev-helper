# Beast Mode Features

FrontendDevHelper includes three next-generation debugging tools that no other extension has. These are the crown jewels of the extension.

## Container Query Inspector

Debug CSS Container Queries with visual overlays showing:

- Container boundaries (purple dashed borders)
- Container types (`inline-size`, `size`, `normal`)
- Container names
- Active `@container` rules
- Real-time dimensions

**Usage:**
1. Open the popup → CSS & Design → Container Query Inspector
2. Or press `Alt+Q`

**Features:**
- Automatic detection of all containers on the page
- Visual overlay with container information
- Lists all `@container` rules for each container
- Updates in real-time as containers resize

## View Transitions Debugger

Debug the View Transitions API with:

- Phase tracking (idle → preparing → animating → finished)
- Pseudo-element tree visualization
- Captured elements list with `view-transition-name`
- Snapshot previews

**Usage:**
1. Open the popup → CSS & Design → View Transitions Debugger
2. Navigate to a page that uses `document.startViewTransition()`
3. Watch the debugger update in real-time

**Features:**
- Detects all view transition pseudo-elements:
  - `::view-transition`
  - `::view-transition-group()`
  - `::view-transition-image-pair()`
  - `::view-transition-old()`
  - `::view-transition-new()`

## Scroll-Driven Animations Debugger

Debug `animation-timeline: scroll()` and `animation-timeline: view()` with:

- Live progress HUD showing all scroll animations
- Per-element progress bars
- Timeline type indicators (scroll vs view)
- Real-time percentage updates

**Usage:**
1. Open the popup → CSS & Design → Scroll Animations Debugger
2. Navigate to a page with scroll-driven animations
3. Watch progress bars update as you scroll

**Features:**
- Detects both `scroll()` and `view()` timelines
- Shows axis (block, inline, x, y)
- Displays source (nearest, root, self)
- Updates at 50ms intervals for smooth animation

## Why These Matter

These features are exclusive to FrontendDevHelper because:

1. **Container Queries** are now baseline in all modern browsers, but debugging them is nearly impossible without specialized tools
2. **View Transitions API** is Chrome's flagship new feature for smooth page transitions, but the pseudo-element structure is complex
3. **Scroll-Driven Animations** enable parallax and scroll-linked effects without JavaScript, but progress is invisible without a debugger

No other extension (VisBug, Polypane, or browser DevTools) provides dedicated debugging for these modern CSS features.
