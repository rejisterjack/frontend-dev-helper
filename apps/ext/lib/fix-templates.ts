// ---------------------------------------------------------------------------
// Fix Templates: Zero-cost fixes for common accessibility issues
// No LLM call needed — these are deterministic, rule-based transformations
// ---------------------------------------------------------------------------

export interface FixTemplate {
  rule: string;
  canFix: (el: HTMLElement) => boolean;
  apply: (el: HTMLElement) => { html: string; description: string } | null;
}

const templates: FixTemplate[] = [
  // Image missing alt text
  {
    rule: 'image-alt',
    canFix: (el) => el.tagName === 'IMG' && !el.hasAttribute('alt'),
    apply: (el) => {
      const src = el.getAttribute('src') || '';
      const filename = src.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
      const alt = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      el.setAttribute('alt', alt);
      return { html: el.outerHTML, description: `Added alt="${alt}" based on filename` };
    },
  },

  // Decorative image (role=presentation or aria-hidden) should have empty alt
  {
    rule: 'image-alt',
    canFix: (el) =>
      el.tagName === 'IMG' &&
      (el.getAttribute('role') === 'presentation' || el.getAttribute('aria-hidden') === 'true') &&
      el.getAttribute('alt')?.trim() === undefined,
    apply: (el) => {
      el.setAttribute('alt', '');
      return { html: el.outerHTML, description: 'Added alt="" for decorative image' };
    },
  },

  // Form element missing label — add aria-label from placeholder or name
  {
    rule: 'label',
    canFix: (el) => {
      const tag = el.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return false;
      const inputType = (el as HTMLInputElement).type;
      if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) return false;
      return !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby');
    },
    apply: (el) => {
      const placeholder = el.getAttribute('placeholder');
      const name = el.getAttribute('name');
      const id = el.id;
      const label = placeholder || name || id || 'form field';
      el.setAttribute('aria-label', label);
      return { html: el.outerHTML, description: `Added aria-label="${label}"` };
    },
  },

  // Link without accessible text — use href or title
  {
    rule: 'link-name',
    canFix: (el) => {
      if (el.tagName !== 'A') return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const text = el.textContent?.trim() || '';
      const ariaLabel = el.getAttribute('aria-label')?.trim() || '';
      const title = el.getAttribute('title')?.trim() || '';
      return !text && !ariaLabel && !title;
    },
    apply: (el) => {
      const href = el.getAttribute('href') || '';
      const linkText = href.startsWith('#') ? 'anchor link' : href.replace(/^https?:\/\//, '').split('/')[0] || 'link';
      el.setAttribute('aria-label', linkText);
      return { html: el.outerHTML, description: `Added aria-label="${linkText}"` };
    },
  },

  // Invalid ARIA role
  {
    rule: 'aria-roles',
    canFix: (el) => {
      const role = el.getAttribute('role')?.trim();
      if (!role) return false;
      const valid = new Set(['alert', 'alertdialog', 'button', 'checkbox', 'dialog', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'menu', 'menubar', 'menuitem', 'navigation', 'none', 'option', 'presentation', 'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'search', 'searchbox', 'slider', 'spinbutton', 'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem']);
      return !valid.has(role);
    },
    apply: (el) => {
      const invalidRole = el.getAttribute('role')!;
      el.removeAttribute('role');
      return { html: el.outerHTML, description: `Removed invalid role="${invalidRole}"` };
    },
  },

  // Focusable element inside aria-hidden
  {
    rule: 'aria-hidden-focus',
    canFix: (el) => {
      if (el.getAttribute('aria-hidden') !== 'true') return false;
      return !!el.querySelector('a, button, input, select, textarea, [tabindex]');
    },
    apply: (el) => {
      el.removeAttribute('aria-hidden');
      return { html: el.outerHTML, description: 'Removed aria-hidden="true" that contained focusable elements' };
    },
  },

  // Positive tabindex
  {
    rule: 'tabindex',
    canFix: (el) => {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0', 10);
      return tabindex > 0;
    },
    apply: (el) => {
      el.setAttribute('tabindex', '0');
      return { html: el.outerHTML, description: 'Changed positive tabindex to 0 for natural tab order' };
    },
  },

  // Clickable div/span without keyboard access
  {
    rule: 'keyboard',
    canFix: (el) => {
      const tag = el.tagName;
      if (tag !== 'DIV' && tag !== 'SPAN') return false;
      if (!el.getAttribute('onclick')) return false;
      return !el.hasAttribute('tabindex') && !el.hasAttribute('role');
    },
    apply: (el) => {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      // Add keyboard handler
      const onclick = el.getAttribute('onclick') || '';
      el.setAttribute('onkeydown', `if(event.key==='Enter'||event.key===' '){${onclick};event.preventDefault()}`);
      return { html: el.outerHTML, description: 'Added tabindex="0", role="button", and keyboard handler' };
    },
  },

  // Missing document lang attribute
  {
    rule: 'html-has-lang',
    canFix: (el) => el.tagName === 'HTML' && !el.hasAttribute('lang'),
    apply: (el) => {
      el.setAttribute('lang', 'en');
      return { html: el.outerHTML, description: 'Added lang="en" to <html>' };
    },
  },

  // Missing document title
  {
    rule: 'document-title',
    canFix: (el) => el.tagName === 'HEAD' && !el.querySelector('title'),
    apply: (el) => {
      const title = document.createElement('title');
      title.textContent = document.location?.hostname || 'Page';
      el.appendChild(title);
      return { html: el.outerHTML, description: 'Added <title> element' };
    },
  },
];

/**
 * Find a matching fix template for a given rule and element.
 * Returns the template or null if no template matches.
 */
export function findFixTemplate(rule: string, element: HTMLElement): FixTemplate | null {
  const normalizedRule = rule.toLowerCase().replace(/[^a-z-]/g, '');
  for (const template of templates) {
    if (template.rule === normalizedRule && template.canFix(element)) {
      return template;
    }
  }
  return null;
}

/**
 * Check if a fix can be applied without an LLM call.
 */
export function hasTemplateFix(rule: string): boolean {
  return templates.some((t) => t.rule === rule);
}

/**
 * Get all rules that have template fixes.
 */
export function getTemplateFixableRules(): string[] {
  return [...new Set(templates.map((t) => t.rule))];
}
