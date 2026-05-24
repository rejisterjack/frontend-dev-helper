import { toolMetadata } from '@/tools/metadata';

const categories = Object.values(toolMetadata).reduce(
  (acc, tool) => {
    if (!acc.includes(tool.category)) acc.push(tool.category);
    return acc;
  },
  [] as string[],
);

browser.devtools.panels.create('FDH', 'icon/128.png', 'devtools-panel.html');

browser.devtools.panels.elements.createSidebarPane('FDH Inspector', (pane) => {
  pane.setPage('devtools-pane.html');

  browser.devtools.inspectedWindow.onResourceChanged.addListener(() => {
    pane.setPage('devtools-pane.html');
  });
});
