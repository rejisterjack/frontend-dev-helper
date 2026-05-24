import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';
import { jumpToElementSource, resolveElementSource } from '@/lib/element-source-resolver';

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isOwnOverlay(el: Element): boolean {
  if (!el) return false;
  const cl = el.classList;
  if (cl) {
    for (let i = 0; i < cl.length; i++) {
      if (cl[i].startsWith('fdh-')) return true;
    }
  }
  return false;
}

function appendStyledSpan(parent: HTMLElement, text: string, color: string): void {
  const span = document.createElement('span');
  span.style.color = color;
  span.textContent = text;
  parent.appendChild(span);
}

function appendLabelValue(parent: HTMLElement, label: string, value: string, labelColor: string, valueColor: string): void {
  const lbl = document.createElement('span');
  lbl.style.color = labelColor;
  lbl.textContent = label;
  parent.appendChild(lbl);
  const val = document.createElement('span');
  val.style.color = valueColor;
  val.textContent = value;
  parent.appendChild(val);
}

export const elementInspector: ToolDefinition = {
  id: 'element-inspector',
  name: 'Element Inspector',
  description: 'Deep inspect element properties, styles, and computed values',
  category: 'inspection',
  icon: 'Scan',
  configSchema: {
    showComputedStyles: { type: 'boolean', label: 'Show Computed Styles', default: true },
    showBoxModel: { type: 'boolean', label: 'Show Box Model', default: true },
    showEventListeners: { type: 'boolean', label: 'Show Event Listeners', default: false },
    showAccessibility: { type: 'boolean', label: 'Show Accessibility', default: true },
    maxStyles: { type: 'slider', label: 'Max Styles Shown', default: 20, min: 5, max: 50, step: 5 },
  },

  run(ctx, config) {
    const showComputedStyles = (config?.showComputedStyles ?? true) as boolean;
    const showBoxModel = (config?.showBoxModel ?? true) as boolean;
    const showAccessibility = (config?.showAccessibility ?? true) as boolean;
    const maxStyles = (config?.maxStyles ?? 20) as number;

    let highlightBox: HTMLElement | null = null;
    let tooltip: HTMLElement | null = null;
    let sourceBadge: HTMLElement | null = null;
    let currentElement: HTMLElement | null = null;
    let isPinned = false;
    let currentSource: { file: string; line: number; column: number } | null = null;
    let hoverSource: { file: string; line: number } | null = null;
    let sourceResolveController: AbortController | null = null;

    function createHighlight(): void {
      if (highlightBox) return;
      highlightBox = document.createElement('div');
      highlightBox.className = 'fdh-ei-highlight';
      highlightBox.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 2147483640;
        border: 2px solid #6366f1;
        background: rgba(99, 102, 241, 0.08);
        border-radius: 2px;
        display: none;
      `;
      addOverlayElement(highlightBox);
    }

    function createTooltipEl(): void {
      if (tooltip) return;
      tooltip = document.createElement('div');
      tooltip.className = 'fdh-ei-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        z-index: 2147483641;
        pointer-events: none;
        background: #1e1e2e;
        color: #cdd6f4;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 12px;
        line-height: 1.5;
        padding: 8px 12px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        border: 1px solid #45475a;
        max-width: 420px;
        display: none;
        word-break: break-word;
      `;
      addOverlayElement(tooltip);
    }

    function createSourceBadge(): void {
      if (sourceBadge) return;
      sourceBadge = document.createElement('div');
      sourceBadge.className = 'fdh-ei-source-badge';
      sourceBadge.style.cssText = `
        position: fixed;
        z-index: 2147483642;
        pointer-events: none;
        background: #6366f1;
        color: #fff;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 10px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 3px;
        display: none;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      addOverlayElement(sourceBadge);
    }

    function removeHighlight(): void {
      if (highlightBox) {
        highlightBox.style.display = 'none';
      }
      if (sourceBadge) {
        sourceBadge.style.display = 'none';
      }
    }

    function removeTooltip(): void {
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }

    function positionHighlight(el: HTMLElement): void {
      if (!highlightBox) return;
      const rect = el.getBoundingClientRect();
      highlightBox.style.display = 'block';
      highlightBox.style.top = `${rect.top}px`;
      highlightBox.style.left = `${rect.left}px`;
      highlightBox.style.width = `${rect.width}px`;
      highlightBox.style.height = `${rect.height}px`;

      // Position source badge above the highlight
      if (sourceBadge && hoverSource) {
        const fileName = hoverSource.file.split('/').pop() || hoverSource.file;
        sourceBadge.textContent = `${fileName}:${hoverSource.line}`;
        sourceBadge.style.display = 'block';
        sourceBadge.style.top = `${rect.top - 18}px`;
        sourceBadge.style.left = `${rect.left}px`;
      } else if (sourceBadge) {
        sourceBadge.style.display = 'none';
      }
    }

    function buildTooltipContent(el: HTMLElement): void {
      if (!tooltip) return;
      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);

      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const classes = el.className && typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).slice(0, 5)
        : [];

      const header = document.createElement('div');
      header.style.cssText = 'font-weight:600;margin-bottom:4px;font-size:13px;display:flex;justify-content:space-between;align-items:center';
      const headerLeft = document.createElement('span');
      appendStyledSpan(headerLeft, `<${tag}>`, '#89b4fa');
      if (el.id) appendStyledSpan(headerLeft, `#${el.id}`, '#f38ba8');
      if (classes.length > 0) appendStyledSpan(headerLeft, `.${classes.join('.')}`, '#a6e3a1');
      header.appendChild(headerLeft);

      if (isPinned && currentSource) {
        const vscodeBtn = document.createElement('button');
        vscodeBtn.textContent = 'Open in VS Code';
        vscodeBtn.style.cssText = 'pointer-events:auto;background:#6366f1;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:inherit';
        vscodeBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (currentSource) {
            jumpToElementSource(el);
          }
        });
        header.appendChild(vscodeBtn);
        tooltip.style.pointerEvents = 'auto';
      }

      tooltip.appendChild(header);

      const dimRow = document.createElement('div');
      dimRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';
      appendStyledSpan(dimRow, `${Math.round(rect.width)} x ${Math.round(rect.height)}`, '#fab387');
      appendStyledSpan(dimRow, `x:${Math.round(rect.x)} y:${Math.round(rect.y)}`, '#94e2d5');
      tooltip.appendChild(dimRow);

      const styleRow = document.createElement('div');
      styleRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:2px';
      appendStyledSpan(styleRow, cs.display, '#cba6f7');
      appendStyledSpan(styleRow, cs.position, '#cba6f7');
      tooltip.appendChild(styleRow);

      const fontRow = document.createElement('div');
      fontRow.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:2px';
      const fontFamily = cs.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
      appendStyledSpan(fontRow, fontFamily, '#89dceb');
      appendStyledSpan(fontRow, cs.fontSize, '#89dceb');
      appendStyledSpan(fontRow, `w:${cs.fontWeight}`, '#89dceb');
      tooltip.appendChild(fontRow);

      if (showBoxModel) {
        const boxSection = document.createElement('div');
        boxSection.style.cssText = 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1)';
        const boxLabel = document.createElement('div');
        boxLabel.style.cssText = 'color:#94a3b8;font-size:10px;margin-bottom:2px';
        boxLabel.textContent = 'Box Model';
        boxSection.appendChild(boxLabel);
        const marginStr = `m:${cs.marginTop.replace('px','')}/${cs.marginRight.replace('px','')}/${cs.marginBottom.replace('px','')}/${cs.marginLeft.replace('px','')}`;
        const paddingStr = `p:${cs.paddingTop.replace('px','')}/${cs.paddingRight.replace('px','')}/${cs.paddingBottom.replace('px','')}/${cs.paddingLeft.replace('px','')}`;
        appendStyledSpan(boxSection, marginStr, '#f9a8d4');
        appendStyledSpan(boxSection, ` ${paddingStr}`, '#86efac');
        tooltip.appendChild(boxSection);
      }

      if (showComputedStyles) {
        const importantProps = [
          'display', 'position', 'width', 'height', 'overflow',
          'flex-direction', 'justify-content', 'align-items', 'gap',
          'grid-template-columns', 'opacity', 'z-index', 'border-radius',
        ];
        let shown = 0;
        const stylesSection = document.createElement('div');
        stylesSection.style.cssText = 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1)';
        const stylesLabel = document.createElement('div');
        stylesLabel.style.cssText = 'color:#94a3b8;font-size:10px;margin-bottom:2px';
        stylesLabel.textContent = 'Computed Styles';
        stylesSection.appendChild(stylesLabel);

        const stylesRow = document.createElement('div');
        stylesRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 10px;font-size:11px';

        for (const prop of importantProps) {
          if (shown >= maxStyles) break;
          const val = cs.getPropertyValue(prop);
          if (val && val !== 'none' && val !== 'normal' && val !== 'auto') {
            appendLabelValue(stylesRow, prop, `${val} `, '#93c5fd', '#a5f3fc');
            shown++;
          }
        }
        stylesSection.appendChild(stylesRow);
        tooltip.appendChild(stylesSection);
      }

      if (showAccessibility) {
        const role = el.getAttribute('role');
        const ariaLabel = el.getAttribute('aria-label');
        const tabIndex = el.getAttribute('tabindex');
        if (role || ariaLabel || tabIndex !== null) {
          const a11ySection = document.createElement('div');
          a11ySection.style.cssText = 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1)';
          const a11yLabel = document.createElement('div');
          a11yLabel.style.cssText = 'color:#94a3b8;font-size:10px;margin-bottom:2px';
          a11yLabel.textContent = 'Accessibility';
          a11ySection.appendChild(a11yLabel);
          if (role) appendStyledSpan(a11ySection, `role=${role} `, '#fbbf24');
          if (ariaLabel) appendStyledSpan(a11ySection, `aria-label="${ariaLabel.slice(0, 30)}" `, '#fbbf24');
          if (tabIndex !== null) appendStyledSpan(a11ySection, `tabindex=${tabIndex}`, '#fbbf24');
          tooltip.appendChild(a11ySection);
        }
      }

      const childCount = el.children.length;
      if (childCount > 0) {
        const childDiv = document.createElement('div');
        childDiv.style.cssText = 'margin-top:2px;color:#9399b2';
        childDiv.textContent = `${childCount} children`;
        tooltip.appendChild(childDiv);
      }

      const hint = document.createElement('div');
      hint.style.cssText = 'margin-top:4px;color:#585b70;font-size:10px';
      hint.textContent = isPinned ? 'Click again to unpin | ESC to unpin' : 'Click to pin | ESC to exit';
      tooltip.appendChild(hint);
    }

    function showTooltipAt(el: HTMLElement, mouseX: number, mouseY: number): void {
      if (!tooltip) return;
      buildTooltipContent(el);
      tooltip.style.display = 'block';

      requestAnimationFrame(() => {
        if (!tooltip) return;
        const pad = 16;
        let left = mouseX + pad;
        let top = mouseY + pad;

        const ttRect = tooltip.getBoundingClientRect();
        if (left + ttRect.width > window.innerWidth - pad) {
          left = mouseX - ttRect.width - pad;
        }
        if (top + ttRect.height > window.innerHeight - pad) {
          top = mouseY - ttRect.height - pad;
        }

        tooltip.style.left = `${Math.max(pad, left)}px`;
        tooltip.style.top = `${Math.max(pad, top)}px`;
      });
    }

    function positionTooltipNearElement(el: HTMLElement): void {
      if (!tooltip) return;
      buildTooltipContent(el);
      tooltip.style.display = 'block';

      requestAnimationFrame(() => {
        if (!tooltip) return;
        const elRect = el.getBoundingClientRect();
        const ttRect = tooltip.getBoundingClientRect();
        const pad = 8;

        let top = elRect.bottom + pad;
        if (top + ttRect.height > window.innerHeight - pad) {
          top = elRect.top - ttRect.height - pad;
        }

        let left = elRect.left;
        if (left + ttRect.width > window.innerWidth - pad) {
          left = window.innerWidth - ttRect.width - pad;
        }

        tooltip.style.left = `${Math.max(pad, left)}px`;
        tooltip.style.top = `${Math.max(pad, top)}px`;
      });
    }

    createHighlight();
    createTooltipEl();
    createSourceBadge();

    const handleMouseMove = (e: MouseEvent) => {
      if (isPinned) return;
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || isOwnOverlay(target) || target === document.documentElement || target === document.body) {
        removeHighlight();
        removeTooltip();
        currentElement = null;
        hoverSource = null;
        return;
      }

      currentElement = target;
      hoverSource = null;
      positionHighlight(target);
      showTooltipAt(target, e.clientX, e.clientY);

      // Resolve source on hover for the badge
      if (sourceResolveController) sourceResolveController.abort();
      sourceResolveController = new AbortController();
      const signal = sourceResolveController.signal;
      resolveElementSource(target).then((source) => {
        if (signal.aborted || currentElement !== target) return;
        if (source) {
          hoverSource = { file: source.file, line: source.line };
          positionHighlight(target);
        }
      });
    };

    const handleClick = (e: MouseEvent) => {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!target || isOwnOverlay(target)) return;

      if (isPinned && currentElement === target) {
        isPinned = false;
        currentSource = null;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      isPinned = true;
      currentElement = target;
      currentSource = null;
      positionHighlight(target);
      positionTooltipNearElement(target);

      // Resolve source location for VS Code jump
      resolveElementSource(target).then((source) => {
        if (source && isPinned && currentElement === target) {
          currentSource = source;
          buildTooltipContent(target);
        }
      });

      e.preventDefault();
      e.stopPropagation();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isPinned) {
          isPinned = false;
          removeTooltip();
          removeHighlight();
          currentElement = null;
        } else {
          cleanup();
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.body.style.cursor = 'crosshair';

    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.cursor = '';
      isPinned = false;
      currentElement = null;
      hoverSource = null;
      if (sourceResolveController) sourceResolveController.abort();
      if (highlightBox) {
        removeOverlayElement(highlightBox);
        highlightBox = null;
      }
      if (tooltip) {
        removeOverlayElement(tooltip);
        tooltip = null;
      }
      if (sourceBadge) {
        removeOverlayElement(sourceBadge);
        sourceBadge = null;
      }
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
