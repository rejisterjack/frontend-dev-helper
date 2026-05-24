import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

const MARGIN_COLOR_DEFAULT = '#3b82f6';
const PADDING_COLOR_DEFAULT = '#22c55e';
const LABEL_BG = 'rgba(0,0,0,0.8)';

function createLabel(value: number, color: string): HTMLElement {
  const label = document.createElement('span');
  label.textContent = `${Math.round(value)}px`;
  label.style.cssText = `
    position: absolute;
    background: ${LABEL_BG};
    color: ${color};
    font-family: monospace;
    font-size: 10px;
    padding: 1px 4px;
    border-radius: 2px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 2147483647;
    line-height: 14px;
  `;
  return label;
}

function positionLabel(
  label: HTMLElement,
  position: 'top' | 'right' | 'bottom' | 'left'
): void {
  switch (position) {
    case 'top':
      label.style.bottom = '2px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      break;
    case 'right':
      label.style.left = '2px';
      label.style.top = '50%';
      label.style.transform = 'translateY(-50%)';
      break;
    case 'bottom':
      label.style.top = '2px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      break;
    case 'left':
      label.style.right = '2px';
      label.style.top = '50%';
      label.style.transform = 'translateY(-50%)';
      break;
  }
}

export const spacingVisualizer: ToolDefinition = {
  id: 'spacing-visualizer',
  name: 'Spacing Visualizer',
  description: 'Visualize margin, padding, and gap spacing on elements',
  category: 'inspection',
  icon: 'Move',
  configSchema: {
    showMargin: { type: 'boolean', label: 'Show Margin', default: true },
    showPadding: { type: 'boolean', label: 'Show Padding', default: true },
    showGap: { type: 'boolean', label: 'Show Gap', default: true },
    marginColor: { type: 'color', label: 'Margin Color', default: '#f97316' },
    paddingColor: { type: 'color', label: 'Padding Color', default: '#22c55e' },
    gapColor: { type: 'color', label: 'Gap Color', default: '#3b82f6' },
    showValues: { type: 'boolean', label: 'Show Values', default: true },
  },

  run(ctx, config) {
    const showMargin = (config?.showMargin ?? true) as boolean;
    const showPadding = (config?.showPadding ?? true) as boolean;
    const showValues = (config?.showValues ?? true) as boolean;
    const marginColor = (config?.marginColor ?? '#f97316') as string;
    const paddingColor = (config?.paddingColor ?? '#22c55e') as string;

    let currentOverlays: HTMLElement[] = [];
    let currentElement: HTMLElement | null = null;

    function clearOverlays(): void {
      for (const el of currentOverlays) {
        removeOverlayElement(el);
      }
      currentOverlays = [];
      currentElement = null;
    }

    function createOverlayBox(color: string): HTMLElement {
      const el = document.createElement('div');
      el.style.cssText = `
        position: fixed;
        pointer-events: none;
        background: ${color}30;
        border: 1px dashed ${color}90;
        box-sizing: border-box;
        z-index: 2147483641;
        display: none;
      `;
      return el;
    }

    function showSpacingOverlays(element: HTMLElement): void {
      clearOverlays();
      currentElement = element;

      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();

      const margin = {
        top: parseFloat(style.marginTop) || 0,
        right: parseFloat(style.marginRight) || 0,
        bottom: parseFloat(style.marginBottom) || 0,
        left: parseFloat(style.marginLeft) || 0,
      };

      const padding = {
        top: parseFloat(style.paddingTop) || 0,
        right: parseFloat(style.paddingRight) || 0,
        bottom: parseFloat(style.paddingBottom) || 0,
        left: parseFloat(style.paddingLeft) || 0,
      };

      if (showMargin) {
        const sides: Array<{ key: 'top' | 'right' | 'bottom' | 'left'; position: 'top' | 'right' | 'bottom' | 'left' }> = [
          { key: 'top', position: 'top' },
          { key: 'right', position: 'right' },
          { key: 'bottom', position: 'bottom' },
          { key: 'left', position: 'left' },
        ];

        for (const { key, position } of sides) {
          if (margin[key] <= 0) continue;
          const box = createOverlayBox(marginColor);

          switch (key) {
            case 'top':
              box.style.top = `${rect.top - margin.top}px`;
              box.style.left = `${rect.left}px`;
              box.style.width = `${rect.width}px`;
              box.style.height = `${margin.top}px`;
              break;
            case 'right':
              box.style.top = `${rect.top}px`;
              box.style.left = `${rect.right}px`;
              box.style.width = `${margin.right}px`;
              box.style.height = `${rect.height}px`;
              break;
            case 'bottom':
              box.style.top = `${rect.bottom}px`;
              box.style.left = `${rect.left}px`;
              box.style.width = `${rect.width}px`;
              box.style.height = `${margin.bottom}px`;
              break;
            case 'left':
              box.style.top = `${rect.top}px`;
              box.style.left = `${rect.left - margin.left}px`;
              box.style.width = `${margin.left}px`;
              box.style.height = `${rect.height}px`;
              break;
          }

          box.style.display = 'block';

          if (showValues && margin[key] >= 2) {
            const label = createLabel(margin[key], marginColor);
            positionLabel(label, position);
            box.appendChild(label);
          }

          currentOverlays.push(box);
          addOverlayElement(box);
        }
      }

      if (showPadding) {
        const sides: Array<{ key: 'top' | 'right' | 'bottom' | 'left'; position: 'top' | 'right' | 'bottom' | 'left' }> = [
          { key: 'top', position: 'top' },
          { key: 'right', position: 'right' },
          { key: 'bottom', position: 'bottom' },
          { key: 'left', position: 'left' },
        ];

        for (const { key, position } of sides) {
          if (padding[key] <= 0) continue;
          const box = createOverlayBox(paddingColor);

          switch (key) {
            case 'top':
              box.style.top = `${rect.top}px`;
              box.style.left = `${rect.left}px`;
              box.style.width = `${rect.width}px`;
              box.style.height = `${padding.top}px`;
              break;
            case 'right':
              box.style.top = `${rect.top}px`;
              box.style.left = `${rect.right - padding.right}px`;
              box.style.width = `${padding.right}px`;
              box.style.height = `${rect.height}px`;
              break;
            case 'bottom':
              box.style.top = `${rect.bottom - padding.bottom}px`;
              box.style.left = `${rect.left}px`;
              box.style.width = `${rect.width}px`;
              box.style.height = `${padding.bottom}px`;
              break;
            case 'left':
              box.style.top = `${rect.top}px`;
              box.style.left = `${rect.left}px`;
              box.style.width = `${padding.left}px`;
              box.style.height = `${rect.height}px`;
              break;
          }

          box.style.display = 'block';

          if (showValues && padding[key] >= 2) {
            const label = createLabel(padding[key], paddingColor);
            positionLabel(label, position);
            box.appendChild(label);
          }

          currentOverlays.push(box);
          addOverlayElement(box);
        }
      }

      const dimLabel = document.createElement('div');
      dimLabel.style.cssText = `
        position: fixed;
        top: ${rect.top - 22}px;
        left: ${rect.left}px;
        background: rgba(0,0,0,0.85);
        color: #fff;
        font-family: monospace;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        pointer-events: none;
        white-space: nowrap;
        z-index: 2147483642;
      `;
      dimLabel.textContent = `${Math.round(rect.width)} x ${Math.round(rect.height)}`;
      currentOverlays.push(dimLabel);
      addOverlayElement(dimLabel);
    }

    const mouseMoveHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || target === document.body || target === document.documentElement) {
        clearOverlays();
        return;
      }
      if (target === currentElement) return;

      showSpacingOverlays(target);
    };

    const mouseOutHandler = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement;
      if (!related || related === document.documentElement) {
        clearOverlays();
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearOverlays();
      }
    };

    let scrollRaf = 0;
    const scrollHandler = () => {
      cancelAnimationFrame(scrollRaf);
      scrollRaf = requestAnimationFrame(() => {
        if (currentElement) {
          showSpacingOverlays(currentElement);
        }
      });
    };

    document.addEventListener('mousemove', mouseMoveHandler, true);
    document.addEventListener('mouseout', mouseOutHandler, true);
    document.addEventListener('keydown', keyHandler, true);
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', scrollHandler);

    const cleanup = () => {
      cancelAnimationFrame(scrollRaf);
      document.removeEventListener('mousemove', mouseMoveHandler, true);
      document.removeEventListener('mouseout', mouseOutHandler, true);
      document.removeEventListener('keydown', keyHandler, true);
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', scrollHandler);
      clearOverlays();
    };

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
