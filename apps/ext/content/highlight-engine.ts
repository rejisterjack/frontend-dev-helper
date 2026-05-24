import { addOverlayElement, removeOverlayElement, createHighlightBox } from './overlay-manager';

interface HighlightOptions {
  color: string;
  showLabel?: boolean;
  getLabel?: (el: HTMLElement) => string;
  onClick?: (el: HTMLElement) => void;
}

export class HighlightEngine {
  private highlightBox: HTMLDivElement | null = null;
  private tooltip: HTMLDivElement | null = null;
  private options: HighlightOptions;
  private onMouseMove: (e: MouseEvent) => void;
  private onMouseLeave: () => void;
  private onClick: (e: MouseEvent) => void;
  private currentElement: HTMLElement | null = null;

  constructor(options: HighlightOptions) {
    this.options = options;
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseLeave = this.handleMouseLeave.bind(this);
    this.onClick = this.handleClick.bind(this);
  }

  start(): void {
    document.addEventListener('mousemove', this.onMouseMove, true);
    document.addEventListener('mouseleave', this.onMouseLeave, true);
    if (this.options.onClick) {
      document.addEventListener('click', this.onClick, true);
    }
  }

  stop(): void {
    document.removeEventListener('mousemove', this.onMouseMove, true);
    document.removeEventListener('mouseleave', this.onMouseLeave, true);
    document.removeEventListener('click', this.onClick, true);
    this.cleanup();
  }

  private handleMouseMove(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (target === this.currentElement) return;
    if (target === this.highlightBox) return;

    this.cleanup();
    this.currentElement = target;

    const rect = target.getBoundingClientRect();
    const label = this.options.showLabel && this.options.getLabel
      ? this.options.getLabel(target)
      : undefined;

    this.highlightBox = createHighlightBox(rect, this.options.color, label);
    addOverlayElement(this.highlightBox);
  }

  private handleMouseLeave(): void {
    this.cleanup();
    this.currentElement = null;
  }

  private handleClick(e: MouseEvent): void {
    if (this.currentElement && this.options.onClick) {
      e.preventDefault();
      e.stopPropagation();
      this.options.onClick(this.currentElement);
    }
  }

  private cleanup(): void {
    if (this.highlightBox) {
      removeOverlayElement(this.highlightBox);
      this.highlightBox = null;
    }
    if (this.tooltip) {
      removeOverlayElement(this.tooltip);
      this.tooltip = null;
    }
  }
}

export function generateSelector(el: HTMLElement): string {
  if (el.id) return `#${CSS.escape(el.id)}`;

  const path: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        selector += '.' + classes.map((c) => CSS.escape(c)).join('.');
      }
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(' > ');
}

export function getComputedStyles(el: HTMLElement): Record<string, string> {
  const computed = window.getComputedStyle(el);
  const styles: Record<string, string> = {};
  const relevantProps = [
    'display', 'position', 'width', 'height', 'margin', 'padding',
    'font-family', 'font-size', 'font-weight', 'line-height',
    'color', 'background-color', 'border', 'border-radius',
    'flex-direction', 'justify-content', 'align-items', 'gap',
    'grid-template-columns', 'grid-template-rows',
    'overflow', 'opacity', 'z-index', 'box-shadow',
  ];
  for (const prop of relevantProps) {
    styles[prop] = computed.getPropertyValue(prop);
  }
  return styles;
}
