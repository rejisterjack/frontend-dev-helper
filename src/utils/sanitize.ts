/**
 * Sanitization Utilities
 *
 * Provides security-focused sanitization functions for preventing XSS attacks.
 * All functions are designed to be used with innerHTML assignments to ensure
 * dynamic content is properly escaped before DOM insertion.
 *
 * @module sanitize
 * @example
 * ```typescript
 * import { escapeHtml, sanitizeColor } from '@/utils/sanitize';
 *
 * // Safe HTML insertion
 * element.innerHTML = `<div>${escapeHtml(userContent)}</div>`;
 *
 * // Safe CSS color
 * element.style.color = sanitizeColor(userColor) || '#000000';
 * ```
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
 * Escapes HTML special characters to prevent XSS attacks.
 *
 * Converts characters that have special meaning in HTML (<, >, &, etc.)
 * into their corresponding HTML entities.
 *
 * @param text - The text to escape
 * @returns The escaped HTML string
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert(1)</script>');
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 * ```
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return String(text);
  return text.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Validates if a string is a valid CSS color.
 *
 * Uses the browser's CSS parser to validate color values.
 * Supports hex, rgb, rgba, hsl, hsla, and named colors.
 *
 * @param color - The color string to validate
 * @returns True if valid CSS color, false otherwise
 *
 * @example
 * ```typescript
 * isValidColor('#ff0000'); // true
 * isValidColor('rgb(255, 0, 0)'); // true
 * isValidColor('invalid'); // false
 * ```
 */
export function isValidColor(color: string): boolean {
  if (typeof color !== 'string') return false;
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

/**
 * Sanitizes a CSS color value by removing dangerous characters.
 *
 * First validates the color, then strips characters that could
 * be used to break out of CSS context (quotes, semicolons, etc.).
 *
 * @param color - The color string to sanitize
 * @returns Sanitized color string, or null if invalid
 *
 * @example
 * ```typescript
 * sanitizeColor('#ff0000" onclick="alert(1)"');
 * // Returns: '#ff0000 onclick=alert(1)'
 * ```
 */
export function sanitizeColor(color: string): string | null {
  if (typeof color !== 'string') return null;
  if (!isValidColor(color)) return null;
  // Remove any characters that could break out of CSS context
  return color.replace(/["';{}<>]/g, '');
}

/**
 * Validates and sanitizes a URL to prevent javascript: protocol injection.
 *
 * Checks for dangerous protocols (javascript:, data:, vbscript:) that could
 * be used for XSS attacks. Returns null if the URL is unsafe.
 *
 * @param url - The URL string to validate
 * @returns Sanitized URL string, or null if unsafe
 *
 * @example
 * ```typescript
 * sanitizeUrl('https://example.com'); // 'https://example.com'
 * sanitizeUrl('javascript:alert(1)'); // null
 * ```
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
 * Sanitizes a number for use in CSS (px, em, rem, etc.).
 *
 * Ensures the value is a valid number within reasonable bounds
 * to prevent performance issues or injection attacks.
 *
 * @param value - The number to sanitize
 * @returns Sanitized number as string
 *
 * @example
 * ```typescript
 * sanitizeCssNumber(100); // '100'
 * sanitizeCssNumber(NaN); // '0'
 * sanitizeCssNumber(10000000); // '1000000' (capped)
 * ```
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
 * Sanitizes a CSS class name by removing invalid characters.
 *
 * Only allows alphanumeric characters, hyphens, and underscores
 * which are valid in CSS class names.
 *
 * @param name - The class name to sanitize
 * @returns Sanitized class name
 */
export function sanitizeClassName(name: string): string {
  if (typeof name !== 'string') return '';
  // Only allow valid CSS class name characters
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Sanitizes an HTML identifier (id, name, etc.).
 *
 * Only allows alphanumeric characters, hyphens, underscores, and colons
 * which are valid in HTML identifiers.
 *
 * @param id - The identifier to sanitize
 * @returns Sanitized identifier
 */
export function sanitizeId(id: string): string {
  if (typeof id !== 'string') return '';
  // Allow alphanumeric, hyphen, underscore, colon
  return id.replace(/[^a-zA-Z0-9_:-]/g, '');
}

/**
 * Creates a text node safely. Automatically escapes HTML entities.
 *
 * This is the preferred method for inserting plain text content
 * as it uses the browser's native text node creation which is XSS-safe.
 *
 * @param text - The text content
 * @returns A Text node containing the escaped content
 *
 * @example
 * ```typescript
 * const textNode = createTextNode('<script>alert(1)</script>');
 * element.appendChild(textNode); // Safe: text is escaped
 * ```
 */
export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

/**
 * Sets text content safely. Automatically escapes HTML.
 *
 * Uses textContent which automatically escapes any HTML,
 * making it safe for user-generated content.
 *
 * @param element - The element to set text on
 * @param text - The text content (will be escaped)
 *
 * @example
 * ```typescript
 * setTextContent(element, '<script>alert(1)</script>');
 * // element now contains escaped text, not executed script
 * ```
 */
export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

/**
 * Sanitizes a CSS dimension string (e.g., "100px", "50%").
 *
 * Validates that the dimension follows expected patterns
 * and returns a safe default if invalid.
 *
 * @param dim - The dimension string to validate
 * @returns Valid dimension string, or '0px' if invalid
 *
 * @example
 * ```typescript
 * sanitizeDimension('100px'); // '100px'
 * sanitizeDimension('invalid'); // '0px'
 * ```
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
 * Template literal tag for HTML with automatic escaping.
 *
 * Usage: html`<div>${userContent}</div>`
 *
 * Automatically escapes interpolated values while preserving
 * the HTML structure of the template.
 *
 * @param strings - Template string parts
 * @param values - Interpolated values to escape
 * @returns Escaped HTML string
 *
 * @example
 * ```typescript
 * const userContent = '<script>alert(1)</script>';
 * const html = html`<div>${userContent}</div>`;
 * // Returns: '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>'
 * ```
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
 * Template literal tag for CSS with validation.
 *
 * Validates and sanitizes CSS values. For color values,
 * validates them; for numbers, sanitizes them; otherwise
 * removes dangerous characters.
 *
 * @param strings - Template string parts
 * @param values - Interpolated values to validate
 * @returns Sanitized CSS string
 *
 * @example
 * ```typescript
 * const userColor = '#ff0000" onclick="alert(1)"';
 * const css = css`color: ${userColor}`;
 * // Returns safe CSS without the onclick injection
 * ```
 */
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, string, i) => {
    const value = values[i];
    if (value === undefined || value === null) {
      return result + string;
    }
    // For colors, validate; for numbers, sanitize; otherwise escape
    const strValue = String(value);
    if (
      string.endsWith('color:') ||
      string.endsWith('background:') ||
      string.endsWith('border-color:')
    ) {
      return result + string + (sanitizeColor(strValue) || 'transparent');
    }
    if (/:\s*$/.test(string) && /^-?\d/.test(strValue)) {
      return result + string + sanitizeCssNumber(value);
    }
    return result + string + strValue.replace(/["';{}<>]/g, '');
  }, '');
}
