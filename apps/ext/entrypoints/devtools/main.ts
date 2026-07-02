import { toolMetadata } from "@/tools/metadata";

const categories = Object.values(toolMetadata).reduce((acc, tool) => {
  if (!acc.includes(tool.category)) acc.push(tool.category);
  return acc;
}, [] as string[]);

browser.devtools.panels.create("FDH", "icon/128.png", "devtools-panel.html");

browser.devtools.panels.elements.createSidebarPane("FDH Inspector", (pane) => {
  pane.setPage("devtools-pane.html");

  // `onResourceChanged` exists at runtime in Chrome 124+ but is not in the
  // current @types/chrome; fall back to `onResourceAdded` at the type level
  // (the listener is a no-op for our use case — we just refresh the panel).
  const win = browser.devtools.inspectedWindow as unknown as {
    onResourceChanged: { addListener: (cb: () => void) => void };
    onResourceAdded: { addListener: (cb: () => void) => void };
  };
  win.onResourceChanged.addListener(() => {
    pane.setPage("devtools-pane.html");
  });
});
