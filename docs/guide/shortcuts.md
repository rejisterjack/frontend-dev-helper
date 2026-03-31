# Keyboard Shortcuts

FrontendDevHelper provides multiple ways to access tools quickly.

## Global Shortcuts (Browser-Level)

These work anywhere in the browser, even when the extension popup is closed:

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Popup | `Ctrl+Shift+F` | `Cmd+Shift+F` |
| Toggle DOM Outliner | `Alt+P` | `Option+P` |
| Toggle CSS Inspector | `Alt+C` | `Option+C` |
| Toggle Grid Overlay | `Alt+G` | `Option+G` |

**Customizing:**
- Chrome: Go to `chrome://extensions/shortcuts`
- Firefox: Go to Add-ons Manager → Gear icon → Manage Extension Shortcuts

## In-App Hotkeys (Extension-Level)

You can set custom shortcuts in the extension Options page. These work only when:

- The popup is open, OR
- The content script is active (you're on a web page)

**Recommended patterns:**
- `Ctrl+Shift+Key` - Quick tool toggles
- `Alt+Shift+Key` - Advanced features

**Setting up:**
1. Click the extension icon → Options
2. Scroll to "In-App Hotkeys" section
3. Click "Record Shortcut" and press your desired key combo
4. Select which tool it should trigger

## Tool-Specific Shortcuts

Many tools have their own keyboard shortcuts when active:

### DOM Outliner
- `Escape` - Deactivate tool
- `Shift + Click` - Lock outline on element

### CSS Inspector
- `Escape` - Close inspector panel
- `Tab` - Navigate between sections

### Z-Index Visualizer
- `V` - Toggle between List and 3D view

### Animation Inspector
- `Space` - Pause/Resume animations
- `Arrow Keys` - Adjust animation speed

## Tips

1. **Don't override browser shortcuts** - Avoid `Ctrl+T`, `Ctrl+W`, `Ctrl+N`, etc.
2. **Use consistent patterns** - Pick a pattern (like `Ctrl+Shift+Letter`) and stick to it
3. **Test on target sites** - Some sites (like Gmail, Figma) may intercept certain shortcuts
4. **Remember the popup shortcut** - `Ctrl+Shift+F` is the fastest way to access any tool
