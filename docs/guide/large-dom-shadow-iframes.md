# Large DOMs, shadow DOM, and iframes

## Large documents

Some tools walk many nodes. Above roughly 1,500 elements, `walkElementsEfficiently` in `src/utils/dom-performance.ts` may **stride-sample** visits (one log line per scan when sampling kicks in). Tools wired to that helper include:

- Scroll animation debugger, container query inspector, z-index visualizer, CSS variable inspector  
- Animation inspector (timeline + detector), responsive testing overflow scan, color picker palette extraction  
- Performance budget DOM size metrics, export-manager / screenshot-studio DOM-to-canvas passes, visual-regression DOM capture  
- React / Vue / Svelte framework detectors  

If a tool feels slow on huge SPAs, disable overlays you do not need or use presets that only enable a small set.

## Shadow DOM

Tools that query `document` only see the light DOM. **Open shadow roots** can be inspected only if the tool explicitly pierces them (few do by default). Closed shadow trees are not accessible to content scripts—this is a platform limitation, not a bug in the extension.

## Iframes

- **Same-origin iframes**: Often reachable if the tool walks frames; behavior varies per tool.
- **Cross-origin iframes**: Content scripts cannot access the embedded document. No inspection inside the iframe is possible from the parent page’s script.

Document these limits when filing issues so maintainers can reproduce quickly.
