/**
 * Element Inspector Module
 *
 * Provides element inspection functionality including:
 * - Highlighting elements on hover
 * - Selecting elements on click
 * - Displaying element information
 */

export interface InspectorOptions {
  highlightColor?: string;
  highlightOpacity?: number;
  showTooltip?: boolean;
  onElementSelect?: (element: HTMLElement) => void;
  onElementHover?: (element: HTMLElement) => void;
}

export class Inspector {
  private options: Required<InspectorOptions>;
  private isActive = false;
  private highlightBox: HTMLElement | null = null;
  private tooltip: HTMLElement | null = null;

  constructor(options: InspectorOptions = {}) {
    this.options = {
      highlightColor: options.highlightColor ?? '#3b82f6',
      highlightOpacity: options.highlightOpacity ?? 0.1,
      showTooltip: options.showTooltip ?? true,
      onElementSelect: options.onElementSelect ?? (() => {}),
      onElementHover: options.onElementHover ?? (() => {}),
    };
  }

  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.createHighlightBox();
    if (this.options.showTooltip) {
      this.createTooltip();
    }
    this.attachEventListeners();
    document.body.style.cursor = 'crosshair';
  }

  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.removeHighlightBox();
    this.removeTooltip();
    this.detachEventListeners();
    document.body.style.cursor = '';
  }

  private createHighlightBox(): void {
    this.highlightBox = document.createElement('div');
    this.highlightBox.className = 'fdh-inspector-highlight';
    this.highlightBox.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 2147483646;
      border: 2px solid ${this.options.highlightColor};
      background-color: ${this.hexToRgba(this.options.highlightColor, this.options.highlightOpacity)};
      border-radius: 2px;
      transition: all 0.1s ease-out;
      display: none;
    `;
    document.body.appendChild(this.highlightBox);
  }

  private removeHighlightBox(): void {
    if (this.highlightBox) {
      this.highlightBox.remove();
      this.highlightBox = null;
    }
  }

  private createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'fdh-inspector-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      background: #1f2937;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      pointer-events: none;
      white-space: nowrap;
      display: none;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    `;
    document.body.appendChild(this.tooltip);
  }

  private removeTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  private attachEventListeners(): void {
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mouseout', this.handleMouseOut, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private detachEventListeners(): void {
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handleMouseOut, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleMouseOver = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (this.isExtensionElement(target)) return;

    e.stopPropagation();
    this.highlightElement(target);
    this.options.onElementHover(target);
  };

  private handleMouseOut = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    this.removeHighlight(target);
  };

  private handleClick = (e: MouseEvent): void => {
    if (!this.isActive) return;

    const target = e.target as HTMLElement;
    if (this.isExtensionElement(target)) return;

    e.preventDefault();
    e.stopPropagation();

    this.options.onElementSelect(target);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    if (e.key === 'Escape') {
      this.deactivate();
    }
  };

  private highlightElement(element: HTMLElement): void {
    if (!this.highlightBox) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    this.highlightBox.style.display = 'block';
    this.highlightBox.style.left = `${rect.left + scrollX}px`;
    this.highlightBox.style.top = `${rect.top + scrollY}px`;
    this.highlightBox.style.width = `${rect.width}px`;
    this.highlightBox.style.height = `${rect.height}px`;

    if (this.tooltip) {
      this.updateTooltip(element, rect);
    }
  }

  private removeHighlight(_element: HTMLElement): void {
    if (this.highlightBox) {
      this.highlightBox.style.display = 'none';
    }
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  private updateTooltip(element: HTMLElement, rect: DOMRect): void {
    if (!this.tooltip) return;

    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList)
      .filter((c) => !c.startsWith('fdh-'))
      .slice(0, 2)
      .join('.');
    const classStr = classes ? `.${classes}` : '';

    const width = Math.round(rect.width);
    const height = Math.round(rect.height);

    this.tooltip.textContent = `${tagName}${id}${classStr} • ${width}×${height}`;
    this.tooltip.style.display = 'block';

    // Position tooltip above the element
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const top = rect.top - tooltipRect.height - 8;

    if (top > 0) {
      this.tooltip.style.top = `${top + window.scrollY}px`;
    } else {
      this.tooltip.style.top = `${rect.bottom + 8 + window.scrollY}px`;
    }

    this.tooltip.style.left = `${Math.max(8, rect.left + window.scrollX)}px`;
  }

  private isExtensionElement(element: HTMLElement): boolean {
    return (
      element.classList.contains('fdh-inspector-highlight') ||
      element.classList.contains('fdh-inspector-tooltip') ||
      element.closest('.fdh-inspector-highlight') !== null ||
      element.closest('.fdh-inspector-tooltip') !== null
    );
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
