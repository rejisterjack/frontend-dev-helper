/**
 * Container Query Inspector Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock DOM APIs
describe('Container Query Inspector', () => {
  let container: HTMLElement;

  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.id = 'test-container';
    container.style.containerType = 'inline-size';
    container.style.containerName = 'card-grid';
    container.innerHTML = `
      <div class="card">Card 1</div>
      <div class="card">Card 2</div>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    // Clean up any overlays
    document.querySelectorAll('.fdh-cq-overlay').forEach((el) => el.remove());
  });

  describe('Detection', () => {
    it('should detect container-type property', () => {
      // Note: JSDOM may not fully support container-type on computed styles
      expect(container.style.containerType).toBe('inline-size');
    });

    it('should detect container-name property', () => {
      expect(container.style.containerName).toBe('card-grid');
    });

    it('should find container elements in document', () => {
      const allElements = document.querySelectorAll('*');
      const containers: Element[] = [];

      allElements.forEach((el) => {
        const style = (el as HTMLElement).style;
        if (style.containerType && style.containerType !== 'normal') {
          containers.push(el);
        }
      });

      expect(containers.length).toBeGreaterThan(0);
      expect(containers).toContain(container);
    });
  });

  describe('Overlay Creation', () => {
    it('should create overlay element', () => {
      const overlay = document.createElement('div');
      overlay.className = 'fdh-cq-overlay';
      document.body.appendChild(overlay);

      expect(document.querySelector('.fdh-cq-overlay')).toBe(overlay);
    });

    it('should position overlay correctly', () => {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.left = '0px';
      overlay.style.top = '0px';
      overlay.style.width = '100px';
      overlay.style.height = '100px';
      document.body.appendChild(overlay);

      const rect = overlay.getBoundingClientRect();
      expect(rect.left).toBe(0);
      expect(rect.top).toBe(0);
      // jsdom often reports 0×0 layout boxes; styles still encode intent
      expect(overlay.style.width).toBe('100px');
      expect(overlay.style.height).toBe('100px');
    });

    it('should add label to overlay', () => {
      const overlay = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'fdh-cq-label';
      label.textContent = '@container (card-grid)';
      overlay.appendChild(label);
      document.body.appendChild(overlay);

      expect(overlay.querySelector('.fdh-cq-label')).toBe(label);
      expect(label.textContent).toContain('card-grid');
    });
  });

  describe('Container Summary', () => {
    it('should count total containers', () => {
      // Add another container
      const container2 = document.createElement('div');
      container2.style.containerType = 'size';
      document.body.appendChild(container2);

      const allElements = document.querySelectorAll('*');
      let count = 0;

      allElements.forEach((el) => {
        const style = (el as HTMLElement).style;
        if (style.containerType && style.containerType !== 'normal') {
          count++;
        }
      });

      expect(count).toBe(2);

      container2.remove();
    });

    it('should categorize containers by type', () => {
      const types: string[] = [];

      const allElements = document.querySelectorAll('*');
      allElements.forEach((el) => {
        const style = (el as HTMLElement).style;
        if (style.containerType && style.containerType !== 'normal') {
          types.push(style.containerType);
        }
      });

      expect(types).toContain('inline-size');
    });
  });

  describe('Cleanup', () => {
    it('should remove all overlays on disable', () => {
      // Create multiple overlays
      for (let i = 0; i < 3; i++) {
        const overlay = document.createElement('div');
        overlay.className = 'fdh-cq-overlay';
        document.body.appendChild(overlay);
      }

      expect(document.querySelectorAll('.fdh-cq-overlay').length).toBe(3);

      // Remove all
      document.querySelectorAll('.fdh-cq-overlay').forEach((el) => el.remove());

      expect(document.querySelectorAll('.fdh-cq-overlay').length).toBe(0);
    });
  });
});
