import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

const ELEMENT_COLORS: Record<string, string> = {
  div: '#ff6b6b',
  section: '#4ecdc4',
  article: '#45b7d1',
  header: '#96ceb4',
  footer: '#88d8b0',
  nav: '#dda0dd',
  aside: '#f7dc6f',
  main: '#bb8fce',
  p: '#f8b500',
  h1: '#ff6b9d',
  h2: '#ff6b9d',
  h3: '#ff6b9d',
  h4: '#ff6b9d',
  h5: '#ff6b9d',
  h6: '#ff6b9d',
  img: '#c7ecee',
  button: '#dfe6e9',
  a: '#74b9ff',
  span: '#a29bfe',
  ul: '#fd79a8',
  ol: '#fd79a8',
  li: '#fdcb6e',
  form: '#6c5ce7',
  input: '#00b894',
};

const DEFAULT_COLOR = '#b2bec3';
const DEPTH_PALETTE = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#f7dc6f',
  '#bb8fce', '#f8b500', '#ff6b9d', '#74b9ff', '#a29bfe',
];
const OVERLAY_CLASS = 'fdh-dom-outline';

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createTooltip(): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    pointer-events: none;
    z-index: 2147483647;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 1px solid rgba(255,255,255,0.2);
    transition: opacity 0.15s ease;
    opacity: 0;
    display: none;
  `;
  return el;
}

function buildTooltipContent(element: Element): DocumentFragment {
  const frag = document.createDocumentFragment();
  const tagName = element.tagName.toLowerCase();

  const tagSpan = document.createElement('span');
  tagSpan.style.cssText = 'color:#ff6b6b;font-weight:bold';
  tagSpan.textContent = `<${tagName}>`;
  frag.appendChild(tagSpan);

  if (element.id) {
    const idSpan = document.createElement('span');
    idSpan.style.cssText = 'color:#4ecdc4';
    idSpan.textContent = ` #${element.id}`;
    frag.appendChild(idSpan);
  }

  const classNames = element.className && typeof element.className === 'string' ? element.className.trim() : '';
  if (classNames) {
    const classSpan = document.createElement('span');
    classSpan.style.cssText = 'color:#f7dc6f';
    classSpan.textContent = ` .${classNames.split(/\s+/).join('.')}`;
    frag.appendChild(classSpan);
  }

  return frag;
}

function getNestingDepth(el: Element): number {
  let depth = 0;
  let current = el.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

export const domOutliner: ToolDefinition = {
  id: 'dom-outliner',
  name: 'DOM Outliner',
  description: 'Visualize DOM structure with colored outlines around elements',
  category: 'inspection',
  icon: 'Box',
  configSchema: {
    showLabels: { type: 'boolean', label: 'Show Labels', default: true },
    outlineColor: { type: 'color', label: 'Outline Color', default: '#ff6b6b' },
    maxDepth: { type: 'slider', label: 'Max Depth', default: 5, min: 1, max: 10, step: 1 },
    excludeHidden: { type: 'boolean', label: 'Exclude Hidden Elements', default: true },
    targetTags: {
      type: 'select',
      label: 'Target Elements',
      default: 'block',
      options: [
        { label: 'Block Elements', value: 'block' },
        { label: 'All Elements', value: 'all' },
        { label: 'Custom Selector', value: 'custom' },
      ],
    },
  },

  run(ctx, config) {
    const showLabels = (config?.showLabels ?? true) as boolean;
    const excludeHidden = (config?.excludeHidden ?? true) as boolean;
    const maxDepth = (config?.maxDepth ?? 5) as number;
    const targetTags = (config?.targetTags ?? 'block') as string;
    const customColor = config?.outlineColor as string | undefined;

    const overlayElements: HTMLElement[] = [];
    const tooltip = createTooltip();
    addOverlayElement(tooltip);

    function getColorForElement(el: Element): string {
      if (customColor) return customColor;
      const tag = el.tagName.toLowerCase();
      if (ELEMENT_COLORS[tag]) return ELEMENT_COLORS[tag];
      return DEFAULT_COLOR;
    }

    function getDepthColor(depth: number): string {
      return DEPTH_PALETTE[depth % DEPTH_PALETTE.length];
    }

    function isBlockElement(el: HTMLElement): boolean {
      if (ELEMENT_COLORS[el.tagName.toLowerCase()]) return true;
      const display = window.getComputedStyle(el).display;
      return display === 'block' || display === 'flex' || display === 'grid' || display.startsWith('inline-');
    }

    function isHidden(el: HTMLElement): boolean {
      if (!excludeHidden) return false;
      const style = window.getComputedStyle(el);
      return style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
    }

    function walkDOM(): void {
      const allElements = document.querySelectorAll('body *');
      let count = 0;
      for (const el of allElements) {
        if (count > maxDepth * 50) break;
        count++;

        const htmlEl = el as HTMLElement;
        if (isHidden(htmlEl)) continue;
        if (targetTags === 'block' && !isBlockElement(htmlEl)) continue;
        if (htmlEl.classList.contains(OVERLAY_CLASS)) continue;

        const tag = htmlEl.tagName.toLowerCase();
        const depth = getNestingDepth(htmlEl);
        const color = customColor || ELEMENT_COLORS[tag] || getDepthColor(depth);
        const rect = htmlEl.getBoundingClientRect();

        if (rect.width === 0 && rect.height === 0) continue;

        const outline = document.createElement('div');
        outline.className = OVERLAY_CLASS;
        outline.style.cssText = `
          position: fixed;
          top: ${rect.top}px;
          left: ${rect.left}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 2px solid ${color};
          pointer-events: none;
          box-sizing: border-box;
          opacity: 0.7;
        `;

        if (showLabels) {
          const label = document.createElement('span');
          label.style.cssText = `
            position: absolute;
            top: -18px;
            left: 0;
            padding: 1px 4px;
            background: ${color};
            color: white;
            font-size: 10px;
            line-height: 16px;
            border-radius: 2px;
            white-space: nowrap;
            pointer-events: none;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          label.textContent = tag;
          outline.appendChild(label);
        }

        overlayElements.push(outline);
        addOverlayElement(outline);
      }
    }

    walkDOM();

    const hoverHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || (target as HTMLElement).classList?.contains(OVERLAY_CLASS)) return;

      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
      tooltip.appendChild(buildTooltipContent(target));
      tooltip.style.display = 'block';
      tooltip.style.opacity = '1';

      const offset = 10;
      const ttRect = tooltip.getBoundingClientRect();
      let top = e.clientY - ttRect.height - offset;
      let left = e.clientX;
      if (top < 0) top = e.clientY + offset;
      if (left + ttRect.width > window.innerWidth) left = window.innerWidth - ttRect.width - offset;

      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    };

    const mouseOutHandler = () => {
      tooltip.style.opacity = '0';
      tooltip.style.display = 'none';
    };

    document.addEventListener('mousemove', hoverHandler, { passive: true });
    document.addEventListener('mouseout', mouseOutHandler, { passive: true });

    let rafId = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const el of overlayElements) removeOverlayElement(el);
        overlayElements.length = 0;
        walkDOM();
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const cleanup = () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', hoverHandler);
      document.removeEventListener('mouseout', mouseOutHandler);
      for (const el of overlayElements) removeOverlayElement(el);
      overlayElements.length = 0;
      removeOverlayElement(tooltip);
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
