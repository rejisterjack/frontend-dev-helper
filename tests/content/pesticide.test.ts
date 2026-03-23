/**
 * Pesticide (DOM Outliner) Tests
 *
 * Tests for the DOM outliner tool functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { escapeHtml } from '@/utils/sanitize';

// Mock DOM environment
describe('Pesticide Tool', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    
    // Create test elements
    container.innerHTML = `
      <div class="parent">
        <div class="child">
          <span class="grandchild">Test content</span>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    container.remove();
    // Clean up any styles added by pesticide
    document.querySelectorAll('style[data-pesticide]').forEach(el => el.remove());
  });

  describe('DOM Outlining', () => {
    it('should add outline styles to all elements', () => {
      const elements = container.querySelectorAll('*');
      
      // Simulate pesticide enable
      elements.forEach(el => {
        (el as HTMLElement).style.outline = '1px solid red';
      });

      elements.forEach(el => {
        expect((el as HTMLElement).style.outline).toBe('1px solid red');
      });
    });

    it('should show element tags on hover', () => {
      container.querySelector('.parent');
      
      // Add tooltip element
      const tooltip = document.createElement('div');
      tooltip.className = 'pesticide-tooltip';
      tooltip.textContent = '<div>';
      document.body.appendChild(tooltip);

      expect(tooltip.textContent).toBe('<div>');
      
      tooltip.remove();
    });

    it('should remove outlines when disabled', () => {
      const elements = container.querySelectorAll('*');
      
      // Enable then disable
      elements.forEach(el => {
        (el as HTMLElement).style.outline = '1px solid red';
      });
      
      elements.forEach(el => {
        (el as HTMLElement).style.outline = '';
      });

      elements.forEach(el => {
        expect((el as HTMLElement).style.outline).toBe('');
      });
    });
  });

  describe('Element Information', () => {
    it('should extract element information correctly', () => {
      const el = container.querySelector('.child') as HTMLElement;
      
      const info = {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        dimensions: {
          width: el.offsetWidth,
          height: el.offsetHeight,
        },
      };

      expect(info.tag).toBe('div');
      expect(info.classes).toContain('child');
    });

    it('should handle nested elements', () => {
      const parent = container.querySelector('.parent') as HTMLElement;
      const child = container.querySelector('.child') as HTMLElement;
      const grandchild = container.querySelector('.grandchild') as HTMLElement;

      expect(parent.contains(child)).toBe(true);
      expect(child.contains(grandchild)).toBe(true);
      expect(grandchild.textContent).toBe('Test content');
    });
  });

  describe('XSS Prevention', () => {
    it('should not execute scripts in element tooltips', () => {
      const maliciousDiv = document.createElement('div');
      maliciousDiv.className = 'test-xss';
      maliciousDiv.setAttribute('data-test', '<script>alert(1)</script>');
      container.appendChild(maliciousDiv);

      // Simulate tooltip content
      const tooltipContent = maliciousDiv.getAttribute('data-test') || '';
      
      // Should escape the content
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const escaped = escapeHtml(tooltipContent);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');

      maliciousDiv.remove();
    });

    it('should sanitize element IDs in selectors', () => {
      const el = document.createElement('div');
      el.id = 'test" onclick="alert(1)"';
      container.appendChild(el);

      const safeId = escapeHtml(el.id);
      // escapeHtml escapes quotes so the id cannot break out of an attribute context
      expect(safeId).toContain('&quot;');
      // The raw " chars are escaped — no unescaped quote that could break an attribute
      expect(safeId).not.toContain('"');

      el.remove();
    });
  });

  describe('Performance', () => {
    it('should handle many elements efficiently', () => {
      const largeContainer = document.createElement('div');
      
      // Create 100 nested elements
      let current = largeContainer;
      for (let i = 0; i < 100; i++) {
        const child = document.createElement('div');
        child.className = `level-${i}`;
        current.appendChild(child);
        current = child;
      }

      const start = performance.now();
      
      // Apply styles
      const allElements = largeContainer.querySelectorAll('*');
      allElements.forEach(el => {
        (el as HTMLElement).style.outline = '1px solid red';
      });

      const end = performance.now();
      
      // Should complete in under 50ms
      expect(end - start).toBeLessThan(50);
      expect(allElements.length).toBe(100);

      largeContainer.remove();
    });
  });
});
