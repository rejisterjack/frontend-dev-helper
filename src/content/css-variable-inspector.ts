/**
 * CSS Variable Inspector
 *
 * Detects, displays, and allows editing of CSS custom properties (variables).
 * Features:
 * - Detect all CSS variables on the page
 * - Show where each variable is defined and used
 * - Live editing of CSS variables with instant preview
 * - Export as design tokens (JSON, CSS, Figma tokens format)
 */

import { walkElementsEfficiently } from '@/utils/dom-performance';
import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';
import { ToolLifecycle } from '@/utils/tool-lifecycle';

export interface CSSVariable {
  name: string;
  value: string;
  computedValue: string;
  definedIn: string;
  scope: 'global' | 'element';
  element?: HTMLElement;
  usageCount: number;
  type: 'color' | 'size' | 'font' | 'shadow' | 'other';
}

export interface CSSVariableGroup {
  category: string;
  variables: CSSVariable[];
}

interface VariableUsage {
  element: HTMLElement;
  property: string;
}

const lifecycle = new ToolLifecycle();

let isActive = false;
let overlayElement: HTMLElement | null = null;
let variableCache: Map<string, CSSVariable> = new Map();

/**
 * Get all CSS variables defined in stylesheets
 */
function getStylesheetVariables(): Map<string, { value: string; source: string }> {
  const variables = new Map<string, { value: string; source: string }>();

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule) {
          const style = rule.style;
          for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (prop.startsWith('--')) {
              variables.set(prop, {
                value: style.getPropertyValue(prop).trim(),
                source: rule.selectorText,
              });
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheet - skip
    }
  }

  return variables;
}

/**
 * Get all CSS variables from inline styles and computed styles
 */
function getElementVariables(
  element: HTMLElement
): Map<string, { value: string; computed: string }> {
  const variables = new Map<string, { value: string; computed: string }>();
  const computed = getComputedStyle(element);

  // Get from inline style
  if (element.style.cssText) {
    const matches = element.style.cssText.match(/--[\w-]+\s*:\s*[^;]+/g);
    if (matches) {
      for (const match of matches) {
        const [name, value] = match.split(':').map((s) => s.trim());
        if (name && value) {
          variables.set(name, { value, computed: computed.getPropertyValue(name).trim() });
        }
      }
    }
  }

  return variables;
}

/**
 * Detect variable type based on value
 */
function detectVariableType(value: string): CSSVariable['type'] {
  const lowerValue = value.toLowerCase();

  // Color detection
  if (
    lowerValue.includes('rgb') ||
    lowerValue.includes('hsl') ||
    lowerValue.includes('#') ||
    /^(red|blue|green|yellow|purple|orange|black|white|gray|grey|transparent)$/.test(lowerValue)
  ) {
    return 'color';
  }

  // Font detection
  if (
    lowerValue.includes('px') &&
    (lowerValue.includes('font') ||
      lowerValue.includes('family') ||
      lowerValue.includes('serif') ||
      lowerValue.includes('sans'))
  ) {
    return 'font';
  }

  // Shadow detection
  if (lowerValue.includes('shadow') || /\d+px\s+\d+px\s+\d+px/.test(lowerValue)) {
    return 'shadow';
  }

  // Size detection
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch|ex|cm|mm|in|pt|pc)$/.test(lowerValue.trim())) {
    return 'size';
  }

  return 'other';
}

/**
 * Scan the entire page for CSS variable usage
 */
function scanVariableUsage(): Map<string, VariableUsage[]> {
  const usage = new Map<string, VariableUsage[]>();

  walkElementsEfficiently(
    document,
    (el) => {
    const computed = getComputedStyle(el as HTMLElement);
    const styles = computed.cssText || '';

    // Find var() usages
    const varMatches = styles.match(/var\s*\(\s*(--[\w-]+)/g);
    if (varMatches) {
      for (const match of varMatches) {
        const varName = match.match(/(--[\w-]+)/)?.[0];
        if (varName) {
          const list = usage.get(varName) || [];
          list.push({ element: el as HTMLElement, property: 'unknown' });
          usage.set(varName, list);
        }
      }
    }
    },
    (msg) => logger.log(msg)
  );

  return usage;
}

/**
 * Collect all CSS variables from the page
 */
export function collectAllVariables(): CSSVariable[] {
  const variables: CSSVariable[] = [];
  const stylesheetVars = getStylesheetVariables();
  const usageMap = scanVariableUsage();

  // Process stylesheet variables
  for (const [name, data] of stylesheetVars) {
    const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    variables.push({
      name,
      value: data.value,
      computedValue: computed || data.value,
      definedIn: data.source,
      scope:
        data.source === ':root' || data.source === 'html' || data.source === 'body'
          ? 'global'
          : 'element',
      usageCount: usageMap.get(name)?.length || 0,
      type: detectVariableType(data.value),
    });
  }

  // Process element-specific variables
  const allElements = document.querySelectorAll('[style*="--"]');
  for (const el of allElements) {
    const elementVars = getElementVariables(el as HTMLElement);
    for (const [name, data] of elementVars) {
      if (!stylesheetVars.has(name)) {
        variables.push({
          name,
          value: data.value,
          computedValue: data.computed,
          definedIn: 'inline',
          scope: 'element',
          element: el as HTMLElement,
          usageCount: usageMap.get(name)?.length || 0,
          type: detectVariableType(data.value),
        });
      }
    }
  }

  // Update cache
  variableCache = new Map(variables.map((v) => [v.name, v]));

  return variables;
}

/**
 * Group variables by category
 */
export function groupVariables(variables: CSSVariable[]): CSSVariableGroup[] {
  const groups = new Map<string, CSSVariable[]>();

  for (const variable of variables) {
    // Extract category from variable name
    let category = 'Other';
    const name = variable.name.toLowerCase();

    if (
      name.includes('color') ||
      name.includes('bg') ||
      name.includes('background') ||
      name.includes('text') ||
      name.includes('border')
    ) {
      category = 'Colors';
    } else if (
      name.includes('size') ||
      name.includes('width') ||
      name.includes('height') ||
      name.includes('space') ||
      name.includes('padding') ||
      name.includes('margin')
    ) {
      category = 'Sizing & Spacing';
    } else if (
      name.includes('font') ||
      name.includes('text') ||
      name.includes('line') ||
      name.includes('letter')
    ) {
      category = 'Typography';
    } else if (
      name.includes('shadow') ||
      name.includes('radius') ||
      name.includes('transition') ||
      name.includes('animation')
    ) {
      category = 'Effects';
    } else if (name.includes('breakpoint') || name.includes('screen') || name.includes('media')) {
      category = 'Responsive';
    } else if (name.includes('z-') || name.includes('index')) {
      category = 'Z-Index';
    }

    const list = groups.get(category) || [];
    list.push(variable);
    groups.set(category, list);
  }

  return Array.from(groups.entries())
    .map(([category, variables]) => ({ category, variables }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Update a CSS variable value
 */
export function updateVariable(name: string, value: string, target?: HTMLElement): void {
  if (target) {
    target.style.setProperty(name, value);
  } else {
    document.documentElement.style.setProperty(name, value);
  }

  // Update cache
  const cached = variableCache.get(name);
  if (cached) {
    cached.value = value;
    cached.computedValue = value;
  }

  logger.log('[CSSVariableInspector] Updated', name, 'to', value);
}

/**
 * Export variables as design tokens
 */
export function exportAsDesignTokens(format: 'json' | 'css' | 'figma'): string {
  const variables = collectAllVariables();

  switch (format) {
    case 'json':
      return JSON.stringify(
        Object.fromEntries(
          variables.map((v) => [
            v.name.replace('--', ''),
            {
              value: v.value,
              type: v.type,
              scope: v.scope,
            },
          ])
        ),
        null,
        2
      );

    case 'css':
      return `:root {
${variables
  .filter((v) => v.scope === 'global')
  .map((v) => `  ${v.name}: ${v.value};`)
  .join('\n')}
}`;

    case 'figma':
      return JSON.stringify(
        {
          version: '1.0',
          tokens: variables.map((v) => ({
            name: v.name.replace('--', '').replace(/-/g, '/'),
            value: v.value,
            type: v.type === 'color' ? 'color' : 'string',
          })),
        },
        null,
        2
      );

    default:
      return '';
  }
}

/**
 * Create the overlay UI
 */
function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = 'fdh-css-variable-inspector';
  overlay.innerHTML = `
    <div class="fdh-cvi-header">
      <h3>CSS Variables</h3>
      <button class="fdh-cvi-close">×</button>
    </div>
    <div class="fdh-cvi-content">
      <div class="fdh-cvi-loading">Scanning...</div>
    </div>
    <div class="fdh-cvi-footer">
      <button class="fdh-cvi-export" data-format="json">Export JSON</button>
      <button class="fdh-cvi-export" data-format="css">Export CSS</button>
      <button class="fdh-cvi-export" data-format="figma">Export Figma</button>
    </div>
  `;

  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    #fdh-css-variable-inspector {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      background: #1e1e2e;
      border: 1px solid #313244;
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #cdd6f4;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .fdh-cvi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #313244;
      background: #181825;
    }
    .fdh-cvi-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .fdh-cvi-close {
      background: none;
      border: none;
      color: #6c7086;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
    }
    .fdh-cvi-close:hover {
      color: #f38ba8;
    }
    .fdh-cvi-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .fdh-cvi-category {
      margin-bottom: 16px;
    }
    .fdh-cvi-category-title {
      font-weight: 600;
      color: #89b4fa;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #313244;
    }
    .fdh-cvi-variable {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 6px;
      margin-bottom: 4px;
      background: #313244;
    }
    .fdh-cvi-variable:hover {
      background: #45475a;
    }
    .fdh-cvi-var-name {
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 11px;
      color: #f5c2e7;
      min-width: 120px;
    }
    .fdh-cvi-var-value {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .fdh-cvi-color-preview {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid #6c7086;
      flex-shrink: 0;
    }
    .fdh-cvi-var-input {
      flex: 1;
      background: #1e1e2e;
      border: 1px solid #45475a;
      border-radius: 4px;
      padding: 4px 8px;
      color: #cdd6f4;
      font-family: 'Monaco', 'Consolas', monospace;
      font-size: 11px;
    }
    .fdh-cvi-var-input:focus {
      outline: none;
      border-color: #89b4fa;
    }
    .fdh-cvi-usage {
      font-size: 10px;
      color: #6c7086;
      margin-left: 8px;
    }
    .fdh-cvi-scope {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 10px;
      background: #585b70;
      color: #cdd6f4;
    }
    .fdh-cvi-scope.global {
      background: #a6e3a1;
      color: #1e1e2e;
    }
    .fdh-cvi-footer {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #313244;
      background: #181825;
    }
    .fdh-cvi-export {
      flex: 1;
      padding: 8px;
      background: #45475a;
      border: none;
      border-radius: 6px;
      color: #cdd6f4;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .fdh-cvi-export:hover {
      background: #585b70;
    }
    .fdh-cvi-loading {
      text-align: center;
      padding: 40px;
      color: #6c7086;
    }
  `;
  document.head.appendChild(styles);

  // Close button
  overlay.querySelector('.fdh-cvi-close')?.addEventListener('click', disable);

  // Export buttons
  overlay.querySelectorAll('.fdh-cvi-export').forEach((btn) => {
    btn.addEventListener('click', () => {
      const format = (btn as HTMLElement).dataset.format as 'json' | 'css' | 'figma';
      const data = exportAsDesignTokens(format);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design-tokens.${format === 'figma' ? 'json' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });

  return overlay;
}

/**
 * Render variables in the overlay
 */
function renderVariables(): void {
  if (!overlayElement) return;

  const content = overlayElement.querySelector('.fdh-cvi-content');
  if (!content) return;

  const variables = collectAllVariables();
  const groups = groupVariables(variables);

  content.innerHTML = groups
    .map(
      (group) => `
    <div class="fdh-cvi-category">
      <div class="fdh-cvi-category-title">${escapeHtml(group.category)} (${group.variables.length})</div>
      ${group.variables
        .map(
          (v) => `
        <div class="fdh-cvi-variable" data-var="${escapeHtml(v.name)}">
          <span class="fdh-cvi-var-name">${escapeHtml(v.name)}</span>
          <span class="fdh-cvi-scope ${escapeHtml(v.scope)}">${escapeHtml(v.scope)}</span>
          <div class="fdh-cvi-var-value">
            ${v.type === 'color' ? `<span class="fdh-cvi-color-preview" style="background: ${escapeHtml(v.computedValue)}"></span>` : ''}
            <input type="text" class="fdh-cvi-var-input" value="${escapeHtml(v.value)}" data-var="${escapeHtml(v.name)}">
            <span class="fdh-cvi-usage">${v.usageCount} uses</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('');

  // Add input listeners
  content.querySelectorAll('.fdh-cvi-var-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const varName = target.dataset.var;
      if (varName) {
        updateVariable(varName, target.value);
        // Update color preview if exists
        const variable = variableCache.get(varName);
        if (variable?.type === 'color') {
          const preview = target.parentElement?.querySelector(
            '.fdh-cvi-color-preview'
          ) as HTMLElement;
          if (preview) {
            preview.style.background = target.value;
          }
        }
      }
    });
  });
}

/**
 * Enable the CSS Variable Inspector
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  lifecycle.start();

  overlayElement = createOverlay();
  document.body.appendChild(overlayElement);

  // Initial render
  renderVariables();

  // Watch for DOM changes
  const observer = new MutationObserver(() => {
    // Debounce re-rendering
    lifecycle.setTimeout(renderVariables, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });

  lifecycle.addObserver(observer);

  logger.log('[CSSVariableInspector] Enabled');
}

/**
 * Disable the CSS Variable Inspector
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  // Tear down observers, timers, event listeners
  lifecycle.destroy();

  overlayElement?.remove();
  overlayElement = null;

  // Clean up styles
  const styles = document.querySelector('style[data-fdh-cvi]');
  styles?.remove();

  logger.log('[CSSVariableInspector] Disabled');
}

/**
 * Toggle the CSS Variable Inspector
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean } {
  return { enabled: isActive };
}

// Aliases for handler compatibility
export const detectCSSVariables = collectAllVariables;
export function exportVariables(format: 'json' | 'css' | 'figma'): string {
  return exportAsDesignTokens(format);
}

// Default export for registry
export default {
  enable,
  disable,
  toggle,
  getState,
};
