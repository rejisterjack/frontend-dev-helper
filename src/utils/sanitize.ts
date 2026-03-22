/**
 * Sanitization Utilities
 *
 * Provides security-focused sanitization functions for preventing XSS.
 */

// HTML entity encoding map
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return String(text);
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Validate color format (hex, rgb, rgba, hsl, hsla)
 */
export function isValidColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * Sanitize color value for CSS usage
 * Removes potentially dangerous characters while preserving valid CSS
 */
export function sanitizeColor(color: string): string | null {
  if (typeof color !== 'string') return null;
  if (!isValidColor(color)) return null;
  // Remove any characters that could break out of CSS context
  return color.replace(/["';{}<>]/g, '');
}

/**
 * Sanitize a URL to prevent javascript: protocol injection
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim().toLowerCase();
  // Block dangerous protocols
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }
  return url;
}

/**
 * Sanitize a number for use in CSS (px, em, rem, etc.)
 */
export function sanitizeCssNumber(value: unknown): string {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return '0';
  // Limit to reasonable range to prevent performance issues
  if (num > 1000000) return '1000000';
  if (num < -1000000) return '-1000000';
  return String(num);
}

/**
 * Sanitize a CSS class name
 */
export function sanitizeClassName(name: string): string {
  if (typeof name !== 'string') return '';
  // Only allow valid CSS class name characters
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Sanitize an identifier (id, name, etc.)
 */
export function sanitizeId(id: string): string {
  if (typeof name !== 'string') return '';
  // Allow alphanumeric, hyphen, underscore, colon
  return id.replace(/[^a-zA-Z0-9_:-]/g, '');
}

/**
 * Create a text node safely (preferred over innerHTML for text content)
 * Automatically escapes HTML entities
 */
export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

/**
 * Set text content safely - automatically escapes HTML
 * Use this instead of innerHTML when inserting plain text
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Sanitize a dimension string (e.g., "100px", "50%")
 */
export function sanitizeDimension(dim: string): string {
  if (typeof dim !== 'string') return '0px';
  // Allow numbers with units or percentages
  if (/^-?\d+(\.\d+)?(px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in|pt|pc)?$/.test(dim)) {
    return dim;
  }
  return '0px';
}

/**
 * Template literal tag for HTML with automatic escaping
 * Usage: html`<div>${userContent}</div>`
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, string, i) => {
    const value = values[i];
    if (value === undefined || value === null) {
      return result + string;
    }
    return result + string + escapeHtml(String(value));
  }, '');
}

/**
 * Template literal tag for CSS with validation
 * Usage: css`color: ${userColor}`
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, string, i) => {
    const value = values[i];
    if (value === undefined || value === null) {
      return result + string;
    }
    // For colors, validate; for numbers, sanitize; otherwise escape
    const strValue = String(value);
    if (string.endsWith('color:') || string.endsWith('background:') || string.endsWith('border-color:')) {
      return result + string + (sanitizeColor(strValue) || 'transparent');
    }
    if (/:\s*$/.test(string) && /^-?\d/.test(strValue)) {
      return result + string + sanitizeCssNumber(value);
    }
    return result + string + strValue.replace(/["';{}<>]/g, '');
  }, '');
}
