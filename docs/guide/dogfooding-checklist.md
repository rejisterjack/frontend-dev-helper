# Weekly dogfooding checklist

Run through this on **three** sites: a simple static page, a heavy SPA (e.g. app dashboard), and a page you personally ship.

1. Open the popup: starter tools visible with “Show all tools” off; presets apply without errors.
2. Command palette (Ctrl+Shift+P): search for a tool added recently; run a preset command.
3. Enable **Layout debug** preset on the SPA; scroll and interact; confirm no persistent jank.
4. **Accessibility pass** preset on a form-heavy page; disable all tools afterward.
5. **Performance pass** preset; confirm network panel mounts and can be closed.
6. Options → Advanced: local diagnostics off by default; toggle on, trigger a forced error if testing, clear counts.
7. DevTools panel (Chromium): select `$0`, copy descriptor, confirm clipboard text matches.

Note failures with URL (or template), browser version, and which tool was active.
