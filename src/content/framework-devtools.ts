/**
 * Multi-Framework DevTools Integration
 *
 * Detects and displays framework-specific information:
 * - React: Component name, props, hooks, state
 * - Vue: Component data, computed, watchers, props
 * - Angular: Component metadata, inputs, outputs
 * - Svelte: Component state, props
 * - Tailwind: Class decoder (hover any Tailwind class to see CSS)
 */

// import { logger } from '@/utils/logger';
import { escapeHtml } from '../utils/sanitize';

export type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'none';

export interface FrameworkComponent {
  name: string;
  framework: FrameworkType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  computed?: Record<string, unknown>;
  hooks?: string[];
  listeners?: string[];
  domElement: HTMLElement;
}

interface ReactHookState {
  queue?: { name?: string };
  memoizedState?: unknown;
  next?: ReactHookState | null;
}

interface ReactFiber {
  type?: {
    name?: string;
    displayName?: string;
  };
  memoizedProps?: Record<string, unknown>;
  memoizedState?: ReactHookState | null;
  child?: ReactFiber;
  sibling?: ReactFiber;
  return?: ReactFiber;
  _debugOwner?: ReactFiber;
}

interface VueComponent {
  __vue__?: {
    $options?: {
      name?: string;
      props?: Record<string, unknown>;
    };
    $props?: Record<string, unknown>;
    $data?: Record<string, unknown>;
    $computed?: Record<string, unknown>;
  };
}

// Tailwind class mappings (subset of common classes)
const TAILWIND_CLASSES: Record<string, string> = {
  // Layout
  block: 'display: block',
  'inline-block': 'display: inline-block',
  inline: 'display: inline',
  flex: 'display: flex',
  'inline-flex': 'display: inline-flex',
  grid: 'display: grid',
  hidden: 'display: none',
  container: 'width: 100%; max-width varies by breakpoint',

  // Position
  static: 'position: static',
  fixed: 'position: fixed',
  absolute: 'position: absolute',
  relative: 'position: relative',
  sticky: 'position: sticky',

  // Flexbox
  'flex-row': 'flex-direction: row',
  'flex-col': 'flex-direction: column',
  'flex-wrap': 'flex-wrap: wrap',
  'flex-nowrap': 'flex-wrap: nowrap',
  'items-start': 'align-items: flex-start',
  'items-center': 'align-items: center',
  'items-end': 'align-items: flex-end',
  'justify-start': 'justify-content: flex-start',
  'justify-center': 'justify-content: center',
  'justify-end': 'justify-content: flex-end',
  'justify-between': 'justify-content: space-between',
  'flex-1': 'flex: 1 1 0%',
  'flex-auto': 'flex: 1 1 auto',
  'flex-grow': 'flex-grow: 1',
  'flex-shrink': 'flex-shrink: 1',

  // Spacing (examples)
  'p-0': 'padding: 0',
  'p-1': 'padding: 0.25rem (4px)',
  'p-2': 'padding: 0.5rem (8px)',
  'p-4': 'padding: 1rem (16px)',
  'p-8': 'padding: 2rem (32px)',
  'm-0': 'margin: 0',
  'm-1': 'margin: 0.25rem (4px)',
  'm-2': 'margin: 0.5rem (8px)',
  'm-4': 'margin: 1rem (16px)',
  'm-8': 'margin: 2rem (32px)',
  'mx-auto': 'margin-left: auto; margin-right: auto',

  // Sizing
  'w-full': 'width: 100%',
  'w-screen': 'width: 100vw',
  'w-auto': 'width: auto',
  'h-full': 'height: 100%',
  'h-screen': 'height: 100vh',
  'h-auto': 'height: auto',
  'min-w-0': 'min-width: 0',
  'min-h-0': 'min-height: 0',
  'max-w-full': 'max-width: 100%',

  // Typography
  'text-xs': 'font-size: 0.75rem (12px)',
  'text-sm': 'font-size: 0.875rem (14px)',
  'text-base': 'font-size: 1rem (16px)',
  'text-lg': 'font-size: 1.125rem (18px)',
  'text-xl': 'font-size: 1.25rem (20px)',
  'text-2xl': 'font-size: 1.5rem (24px)',
  'font-thin': 'font-weight: 100',
  'font-light': 'font-weight: 300',
  'font-normal': 'font-weight: 400',
  'font-medium': 'font-weight: 500',
  'font-bold': 'font-weight: 700',

  // Colors
  'text-white': 'color: #ffffff',
  'text-black': 'color: #000000',
  'text-gray-500': 'color: #6b7280',
  'text-blue-500': 'color: #3b82f6',
  'text-red-500': 'color: #ef4444',
  'text-green-500': 'color: #22c55e',
  'bg-white': 'background-color: #ffffff',
  'bg-black': 'background-color: #000000',
  'bg-gray-100': 'background-color: #f3f4f6',
  'bg-blue-500': 'background-color: #3b82f6',

  // Border radius
  'rounded-none': 'border-radius: 0',
  rounded: 'border-radius: 0.25rem (4px)',
  'rounded-md': 'border-radius: 0.375rem (6px)',
  'rounded-lg': 'border-radius: 0.5rem (8px)',
  'rounded-xl': 'border-radius: 0.75rem (12px)',
  'rounded-full': 'border-radius: 9999px',

  // Shadows
  'shadow-none': 'box-shadow: none',
  'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)',
  shadow: 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1)',
  'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)',
  'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1)',

  // Transitions
  transition: 'transition-property: all',
  'transition-colors': 'transition-property: color, background-color, border-color',
  'duration-75': 'transition-duration: 75ms',
  'duration-100': 'transition-duration: 100ms',
  'duration-200': 'transition-duration: 200ms',
  'duration-300': 'transition-duration: 300ms',

  // Transforms
  transform: 'transform: translateZ(0)',
  'scale-0': 'transform: scale(0)',
  'scale-100': 'transform: scale(1)',
  'rotate-0': 'transform: rotate(0deg)',
  'rotate-45': 'transform: rotate(45deg)',
  'rotate-90': 'transform: rotate(90deg)',
};

/**
 * Detect which framework is being used on the page
 */
export function detectFramework(): FrameworkType {
  if (
    (window as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown }).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
    document.querySelector('[data-reactroot], [data-reactid]')
  ) {
    return 'react';
  }

  if (
    (window as { __VUE__?: unknown }).__VUE__ ||
    document.querySelector('[data-v-app], [data-vue-root]')
  ) {
    return 'vue';
  }

  if ((window as { ng?: unknown }).ng || document.querySelector('[ng-app], [ng-version]')) {
    return 'angular';
  }

  if ((window as { __svelte?: unknown }).__svelte || document.querySelector('[data-svelte]')) {
    return 'svelte';
  }

  return 'none';
}

/**
 * Get React component info from an element
 */
function getReactComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const key = Object.keys(element).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  if (!key) return null;

  const fiber = (element as unknown as Record<string, ReactFiber>)[key];
  if (!fiber) return null;

  // Walk up to find the component that owns this DOM element
  let owner = fiber._debugOwner || fiber.return;
  while (owner && (owner.type?.name === 'undefined' || !owner.type?.name)) {
    owner = owner.return;
  }

  if (!owner) return null;

  return {
    name: owner.type?.name || owner.type?.displayName || 'Unknown',
    framework: 'react',
    props: owner.memoizedProps || {},
    domElement: element,
    hooks: extractReactHooks(owner),
  };
}

/**
 * Extract React hooks from fiber
 */
function extractReactHooks(fiber: ReactFiber): string[] {
  const hooks: string[] = [];
  let state: ReactHookState | null | undefined = fiber.memoizedState;

  while (state) {
    if (state.queue && state.queue.name) {
      hooks.push(state.queue.name);
    } else if (state.memoizedState && typeof state.memoizedState === 'object') {
      hooks.push('useState');
    }
    state = state.next ?? null;
  }

  return hooks;
}

/**
 * Get Vue component info from an element
 */
function getVueComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const vueEl = element as unknown as VueComponent;
  const component =
    vueEl.__vue__ || (element as unknown as Record<string, unknown>).__vueParentComponent;

  if (!component) {
    // Try to find Vue component by walking up DOM
    let parent = element.parentElement;
    while (parent) {
      const parentVue = parent as unknown as VueComponent;
      if (parentVue.__vue__) {
        return {
          name: parentVue.__vue__.$options?.name || 'Anonymous',
          framework: 'vue',
          props: parentVue.__vue__.$props || {},
          state: parentVue.__vue__.$data || {},
          computed: parentVue.__vue__.$computed || {},
          domElement: element,
        };
      }
      parent = parent.parentElement;
    }
    return null;
  }

  return {
    name: (component as { $options?: { name?: string } }).$options?.name || 'Anonymous',
    framework: 'vue',
    props: (component as { $props?: Record<string, unknown> }).$props || {},
    state: (component as { $data?: Record<string, unknown> }).$data || {},
    domElement: element,
  };
}

/**
 * Get Angular component info
 */
function getAngularComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const ngComponent = (element as unknown as Record<string, unknown>).ngComponent;
  if (!ngComponent) return null;

  return {
    name:
      (ngComponent as { constructor?: { name?: string } }).constructor?.name || 'AngularComponent',
    framework: 'angular',
    props: {},
    domElement: element,
  };
}

/**
 * Get Svelte component info
 */
function getSvelteComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const svelteComponent = Object.keys(element).find((k) => k.startsWith('__svelte'));
  if (!svelteComponent) return null;

  const component = (element as unknown as Record<string, { ctx?: unknown[] }>)[svelteComponent];

  return {
    name: 'SvelteComponent',
    framework: 'svelte',
    props: component.ctx ? Object.fromEntries(component.ctx.map((v, i) => [`prop${i}`, v])) : {},
    domElement: element,
  };
}

/**
 * Get component info for an element based on detected framework
 */
export function getComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const framework = detectFramework();

  switch (framework) {
    case 'react':
      return getReactComponentInfo(element);
    case 'vue':
      return getVueComponentInfo(element);
    case 'angular':
      return getAngularComponentInfo(element);
    case 'svelte':
      return getSvelteComponentInfo(element);
    default:
      return null;
  }
}

/**
 * Get Tailwind class info
 */
export function getTailwindClassInfo(className: string): string | null {
  // Handle responsive prefixes
  const prefixes = ['sm:', 'md:', 'lg:', 'xl:', '2xl:', 'hover:', 'focus:', 'active:', 'disabled:'];
  let cleanClass = className;
  let prefix = '';

  for (const p of prefixes) {
    if (className.startsWith(p)) {
      cleanClass = className.slice(p.length);
      prefix = p;
      break;
    }
  }

  // Handle arbitrary values
  if (cleanClass.includes('[') && cleanClass.includes(']')) {
    const match = cleanClass.match(/\[(.+?)\]/);
    if (match) {
      return `${prefix}${cleanClass.split('[')[0]}: ${match[1]}`;
    }
  }

  // Check for direct match
  if (TAILWIND_CLASSES[cleanClass]) {
    return prefix
      ? `@${prefix.slice(0, -1)} breakpoint/state: ${TAILWIND_CLASSES[cleanClass]}`
      : TAILWIND_CLASSES[cleanClass];
  }

  // Check for pattern matches
  // Spacing patterns
  const spacingMatch = cleanClass.match(
    /^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-(\d+|\d+\.\d+)$/
  );
  if (spacingMatch) {
    const [, type, value] = spacingMatch;
    const remValue = value.includes('.') ? parseFloat(value) * 0.25 : parseInt(value) * 0.25;
    const pxValue = Math.round(remValue * 16);
    const property = {
      p: 'padding',
      px: 'padding-left/right',
      py: 'padding-top/bottom',
      pt: 'padding-top',
      pr: 'padding-right',
      pb: 'padding-bottom',
      pl: 'padding-left',
      m: 'margin',
      mx: 'margin-left/right',
      my: 'margin-top/bottom',
      mt: 'margin-top',
      mr: 'margin-right',
      mb: 'margin-bottom',
      ml: 'margin-left',
    }[type];
    return `${prefix}${property}: ${remValue}rem (${pxValue}px)`;
  }

  // Width/Height patterns
  const sizeMatch = cleanClass.match(/^(w|h)-(\d+|\d+\.\d+|\/|\d+\/\d+|screen|full|auto|px)$/);
  if (sizeMatch) {
    const [, type, value] = sizeMatch;
    const property = type === 'w' ? 'width' : 'height';

    if (value === 'full') return `${prefix}${property}: 100%`;
    if (value === 'screen') return `${prefix}${property}: 100v${type}`;
    if (value === 'auto') return `${prefix}${property}: auto`;
    if (value === 'px') return `${prefix}${property}: 1px`;
    if (value.includes('/')) {
      const [num, den] = value.split('/');
      return `${prefix}${property}: ${(parseInt(num) / parseInt(den)) * 100}%`;
    }

    const remValue = value.includes('.') ? parseFloat(value) * 0.25 : parseInt(value) * 0.25;
    return `${prefix}${property}: ${remValue}rem`;
  }

  // Color patterns
  const colorMatch = cleanClass.match(/^(text|bg|border)-([a-z]+)-(\d+)$/);
  if (colorMatch) {
    const [, type, color, shade] = colorMatch;
    const property =
      type === 'text' ? 'color' : type === 'bg' ? 'background-color' : 'border-color';
    return `${prefix}${property}: ${color}-${shade}`;
  }

  return null;
}

/**
 * Decode all Tailwind classes on an element
 */
export function decodeTailwindClasses(
  element: HTMLElement
): Array<{ class: string; meaning: string }> {
  const classes = Array.from(element.classList);
  return classes
    .map((cls) => ({ class: cls, meaning: getTailwindClassInfo(cls) }))
    .filter((item): item is { class: string; meaning: string } => item.meaning !== null);
}

/**
 * Create framework info overlay
 */
export function createFrameworkInfo(element: HTMLElement): HTMLElement | null {
  const component = getComponentInfo(element);
  const tailwindClasses = decodeTailwindClasses(element);

  if (!component && tailwindClasses.length === 0) {
    return null;
  }

  const overlay = document.createElement('div');
  overlay.className = 'fdh-framework-info';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    max-height: 70vh;
    background: #1e1e2e;
    border: 1px solid #313244;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #cdd6f4;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  let content = '';

  if (component) {
    content += `
      <div style="padding: 12px 16px; border-bottom: 1px solid #313244; background: #181825;">
        <div style="font-size: 11px; text-transform: uppercase; color: #89b4fa; font-weight: 600; margin-bottom: 4px;">
          ${escapeHtml(component.framework.toUpperCase())} Component
        </div>
        <div style="font-size: 16px; font-weight: 600; color: #f5c2e7; font-family: monospace;">
          ${escapeHtml(component.name)}
        </div>
      </div>
    `;

    if (component.props && Object.keys(component.props).length > 0) {
      content += `
        <div style="padding: 12px 16px; border-bottom: 1px solid #313244;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6c7086; margin-bottom: 8px;">Props</div>
          <div style="font-family: monospace; font-size: 12px;">
            ${Object.entries(component.props)
              .filter(
                ([key]) =>
                  !key.startsWith('__') && key !== 'children' && key !== 'key' && key !== 'ref'
              )
              .slice(0, 10)
              .map(
                ([key, value]) => `
                <div style="margin-bottom: 4px;">
                  <span style="color: #89b4fa;">${escapeHtml(key)}</span>: <span style="color: #a6e3a1;">${escapeHtml(JSON.stringify(value).slice(0, 50))}</span>
                </div>
              `
              )
              .join('')}
            ${Object.keys(component.props).length > 10 ? `<div style="color: #6c7086; font-size: 11px;">+ ${Object.keys(component.props).length - 10} more...</div>` : ''}
          </div>
        </div>
      `;
    }

    if (component.state && Object.keys(component.state).length > 0) {
      content += `
        <div style="padding: 12px 16px; border-bottom: 1px solid #313244;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6c7086; margin-bottom: 8px;">State</div>
          <div style="font-family: monospace; font-size: 12px;">
            ${Object.entries(component.state)
              .slice(0, 5)
              .map(
                ([key, value]) => `
                <div style="margin-bottom: 4px;">
                  <span style="color: #fab387;">${escapeHtml(key)}</span>: <span style="color: #a6e3a1;">${escapeHtml(JSON.stringify(value).slice(0, 50))}</span>
                </div>
              `
              )
              .join('')}
          </div>
        </div>
      `;
    }

    if (component.hooks && component.hooks.length > 0) {
      content += `
        <div style="padding: 12px 16px; border-bottom: 1px solid #313244;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6c7086; margin-bottom: 8px;">Hooks</div>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${component.hooks
              .map(
                (hook) => `
              <span style="background: #313244; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-family: monospace;">${escapeHtml(hook)}</span>
            `
              )
              .join('')}
          </div>
        </div>
      `;
    }
  }

  if (tailwindClasses.length > 0) {
    content += `
      <div style="padding: 12px 16px; flex: 1; overflow-y: auto;">
        <div style="font-size: 11px; text-transform: uppercase; color: #6c7086; margin-bottom: 8px;">Tailwind Classes</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${tailwindClasses
            .slice(0, 20)
            .map(
              ({ class: cls, meaning }) => `
            <div style="background: #313244; padding: 8px 12px; border-radius: 6px;">
              <div style="font-family: monospace; font-size: 12px; color: #89b4fa; margin-bottom: 2px;">${escapeHtml(cls)}</div>
              <div style="font-size: 11px; color: #cdd6f4;">${escapeHtml(meaning)}</div>
            </div>
          `
            )
            .join('')}
          ${tailwindClasses.length > 20 ? `<div style="color: #6c7086; font-size: 11px; text-align: center;">+ ${tailwindClasses.length - 20} more classes</div>` : ''}
        </div>
      </div>
    `;
  }

  content += `
    <div style="padding: 12px 16px; border-top: 1px solid #313244; background: #181825; display: flex; gap: 8px;">
      <button class="fdh-fw-copy-props" style="flex: 1; padding: 8px; background: #45475a; border: none; border-radius: 6px; color: #cdd6f4; font-size: 12px; cursor: pointer;">Copy Props</button>
      <button class="fdh-fw-close" style="flex: 1; padding: 8px; background: #45475a; border: none; border-radius: 6px; color: #cdd6f4; font-size: 12px; cursor: pointer;">Close</button>
    </div>
  `;

  overlay.innerHTML = content;

  // Close button
  overlay.querySelector('.fdh-fw-close')?.addEventListener('click', () => {
    overlay.remove();
  });

  // Copy props button
  overlay.querySelector('.fdh-fw-copy-props')?.addEventListener('click', () => {
    if (component?.props) {
      navigator.clipboard.writeText(JSON.stringify(component.props, null, 2));
      const btn = overlay.querySelector('.fdh-fw-copy-props') as HTMLButtonElement;
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy Props'), 1500);
    }
  });

  return overlay;
}

/**
 * Get page framework info
 */
export function getPageFrameworkInfo(): {
  framework: FrameworkType;
  version?: string;
  componentCount?: number;
} {
  const framework = detectFramework();
  const info: {
    framework: FrameworkType;
    version?: string;
    componentCount?: number;
  } = { framework };

  if (framework === 'react') {
    const reactVersion = (window as { React?: { version?: string } }).React?.version;
    if (reactVersion) info.version = reactVersion;
  } else if (framework === 'vue') {
    const vueVersion = (window as { Vue?: { version?: string } }).Vue?.version;
    if (vueVersion) info.version = vueVersion;
  } else if (framework === 'angular') {
    const ngVersion = document.querySelector('[ng-version]')?.getAttribute('ng-version');
    if (ngVersion) info.version = ngVersion;
  }

  return info;
}

/**
 * Detect all frameworks on the page
 */
export function detectAll(): Array<{ name: string; detected: boolean; version?: string }> {
  const info = getPageFrameworkInfo();
  return [
    { name: 'react', detected: info.framework === 'react', version: info.version },
    { name: 'vue', detected: info.framework === 'vue', version: info.version },
    { name: 'angular', detected: info.framework === 'angular', version: info.version },
    { name: 'svelte', detected: info.framework === 'svelte', version: info.version },
    { name: 'tailwind', detected: !!(window as unknown as Record<string, unknown>).tailwindcss },
  ];
}

/**
 * Get React component tree (placeholder - would need React DevTools integration)
 */
interface ReactDevToolsHook {
  reactDevtoolsAgent?: unknown;
}

export function getReactComponentTree(): { name: string; children: unknown[] } | null {
  // This would require React DevTools hook integration
  // For now, return a placeholder
  const win = window as unknown as { __REACT_DEVTOOLS_GLOBAL_HOOK__?: ReactDevToolsHook };
  if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__?.reactDevtoolsAgent) {
    return { name: 'Root', children: [] };
  }
  return null;
}

// ============================================
// Tool State Management
// ============================================

let isActive = false;

export function enable(): void {
  if (isActive) return;
  isActive = true;
  // Framework detection is passive, no DOM modifications needed
}

export function disable(): void {
  if (!isActive) return;
  isActive = false;
}

export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

export function getState(): { enabled: boolean } {
  return { enabled: isActive };
}

// Export all functions
export default {
  enable,
  disable,
  toggle,
  getState,
  detectFramework,
  getComponentInfo,
  getTailwindClassInfo,
  decodeTailwindClasses,
  createFrameworkInfo,
  getPageFrameworkInfo,
  detectAll,
  getReactComponentTree,
};
