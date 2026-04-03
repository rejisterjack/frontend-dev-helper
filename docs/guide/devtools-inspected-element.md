# DevTools-first workflow (inspected element)

When you select a node in Chrome **Elements**, the extension DevTools sidebar evaluates a simple CSS selector (`#id` when present, otherwise the element tag) and sends `FDH_INSPECTED_HINT` through the background worker to the inspected tab’s content script. The content script scrolls the first matching element into view and flashes a short outline.

This is best-effort: ambiguous selectors may match the wrong node; shadow DOM and generated markup are not pierced unless the selector happens to reach them.
