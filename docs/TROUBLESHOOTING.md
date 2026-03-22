# Troubleshooting Guide

This guide helps resolve common issues with FrontendDevHelper.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Build Issues](#build-issues)
- [Runtime Issues](#runtime-issues)
- [Performance Issues](#performance-issues)
- [Debug Mode](#debug-mode)

## Installation Issues

### Extension Not Loading

**Symptom:** Extension shows "Error" in Chrome extensions page

**Solutions:**
1. Check `manifest.json` syntax:
   ```bash
   pnpm run build
   cat dist/manifest.json | python -m json.tool
   ```

2. Verify all required files exist in `dist/`:
   - `manifest.json`
   - `service-worker.js` (or `background.js`)
   - Content script files
   - HTML files (popup.html, options.html, panel.html)

3. Check Chrome console for extension errors:
   - Go to `chrome://extensions/`
   - Click "Errors" button on FrontendDevHelper

### Manifest Version Mismatch

**Symptom:** "Manifest file is missing or unreadable"

**Solutions:**
1. Ensure you're selecting the `dist` folder, not the project root
2. Verify manifest version matches Chrome version (V3 for Chrome 88+)
3. Check for JSON syntax errors

## Build Issues

### TypeScript Errors

**Symptom:** Build fails with TypeScript errors

**Solutions:**
1. Run type check:
   ```bash
   pnpm run type-check
   ```

2. Check for common issues:
   - Missing type imports
   - `any` type usage (enable `noExplicitAny` in biome.json)
   - Incorrect interface definitions

3. Update types:
   ```bash
   pnpm update @types/chrome
   ```

### Biome Linting Errors

**Symptom:** `pnpm run lint` fails

**Solutions:**
1. Auto-fix issues:
   ```bash
   pnpm run lint:fix
   ```

2. Format code:
   ```bash
   pnpm run format
   ```

3. Check specific rules:
   ```bash
   pnpm run lint -- --verbose
   ```

### Bundle Size Warning

**Symptom:** `(!) Some chunks are larger than 500 kB`

**Solutions:**
1. Analyze bundle size:
   ```bash
   pnpm run build -- --analyze
   ```

2. Implement code splitting for heavy tools
3. Use dynamic imports:
   ```typescript
   const heavyModule = await import('./heavy-module');
   ```

## Runtime Issues

### Tools Not Activating

**Symptom:** Clicking tool button doesn't activate tool

**Solutions:**
1. Check content script injection:
   - Open DevTools on the page
   - Look for `[FrontendDevHelper]` logs in console
   - Check for injection errors

2. Verify message passing:
   ```javascript
   // In DevTools console on the page
   chrome.runtime.sendMessage({ type: 'PING' }, console.log);
   ```

3. Check service worker status:
   - Go to `chrome://extensions/`
   - Find "Service Worker" link
   - Check for errors in service worker console

### Content Script Not Loading

**Symptom:** Tools work on some pages but not others

**Solutions:**
1. Check if page is allowed:
   - Extension can't run on `chrome://` URLs
   - Some sites block content scripts
   - Check `manifest.json` `matches` patterns

2. Reload extension:
   - Go to `chrome://extensions/`
   - Click refresh icon on FrontendDevHelper

3. Check content security policy:
   - Ensure CSP in manifest allows required resources

### Popup Not Opening

**Symptom:** Clicking extension icon does nothing

**Solutions:**
1. Check popup HTML:
   - Verify `popup.html` exists in `dist/`
   - Check for JavaScript errors in popup
   - Open popup DevTools: right-click → Inspect popup

2. Check permissions:
   - Verify `activeTab` permission in manifest
   - Check console for permission errors

## Performance Issues

### Extension Slowing Down Page

**Symptom:** Page becomes unresponsive when extension is active

**Solutions:**
1. Disable heavy tools:
   - Visual Regression
   - Performance Monitor
   - AI Suggestions

2. Check for memory leaks:
   - Open DevTools → Memory tab
   - Take heap snapshots
   - Look for detached DOM nodes

3. Profile extension:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "background page" → Performance tab

### High Memory Usage

**Symptom:** Extension uses too much memory

**Solutions:**
1. Clear storage:
   ```javascript
   // In service worker console
   chrome.storage.local.clear();
   ```

2. Disable image caching in Visual Regression
3. Reduce screenshot quality in settings

## Debug Mode

### Enable Debug Logging

Set debug flag in console:

```javascript
// In content script or service worker
localStorage.setItem('fdh_debug', 'true');
```

Or enable in settings:

```javascript
chrome.storage.local.set({
  'fdh_settings': { debugMode: true }
});
```

### View Debug Logs

All debug logs are prefixed with `[FrontendDevHelper]`:

```
[FrontendDevHelper] Content script injected
[FrontendDevHelper] Message received: PESTICIDE_ENABLE
[FrontendDevHelper] Tool enabled: pesticide
```

### Service Worker Debugging

1. Go to `chrome://extensions/`
2. Find FrontendDevHelper
3. Click "Service Worker" link
4. Use console for debugging

### Content Script Debugging

1. Open DevTools on the target page (F12)
2. Go to Sources tab
3. Find `content-scripts` in page tree
4. Set breakpoints in content script files

### Popup Debugging

1. Click extension icon
2. Right-click on popup
3. Select "Inspect"
4. Use DevTools for debugging

## Common Error Messages

### "Could not establish connection"

**Cause:** Content script not injected or page not allowed

**Fix:** Refresh the page and try again

### "Message type not recognized"

**Cause:** Sending unknown message type

**Fix:** Check message type spelling in registry

### "Unchecked runtime.lastError"

**Cause:** Async operation without error handling

**Fix:** Add error callbacks to all chrome API calls

## Getting Help

If issues persist:

1. Check [GitHub Issues](https://github.com/yourusername/frontend-dev-helper/issues)
2. Enable debug mode and collect logs
3. Create a minimal reproduction case
4. Open a new issue with:
   - Browser version
   - Extension version
   - Steps to reproduce
   - Debug logs
   - Screenshots if applicable
