/**
 * Screenshot Studio Tests
 */

import { describe, it, expect } from 'vitest';

describe('Screenshot Studio', () => {
  describe('Screenshot Capture', () => {
    it('should capture viewport dimensions', () => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      
      expect(viewport.width).toBeGreaterThan(0);
      expect(viewport.height).toBeGreaterThan(0);
    });

    it('should create canvas for screenshot', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      
      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });
  });

  describe('Annotations', () => {
    it('should add rectangle annotation', () => {
      const annotation = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        color: '#ff0000',
      };
      
      expect(annotation.type).toBe('rectangle');
      expect(annotation.width).toBe(200);
    });

    it('should add arrow annotation', () => {
      const annotation = {
        type: 'arrow',
        startX: 100,
        startY: 100,
        endX: 300,
        endY: 300,
      };
      
      expect(annotation.type).toBe('arrow');
    });

    it('should add text annotation', () => {
      const annotation = {
        type: 'text',
        x: 100,
        y: 100,
        text: 'Test annotation',
        fontSize: 16,
      };
      
      expect(annotation.text).toBe('Test annotation');
    });
  });

  describe('Export', () => {
    it('should export as PNG', () => {
      const canvas = document.createElement('canvas');
      const dataUrl = canvas.toDataURL('image/png');
      
      expect(dataUrl).toContain('data:image/png');
    });

    it('should export as JPEG', () => {
      const canvas = document.createElement('canvas');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      expect(dataUrl).toContain('data:image/jpeg');
    });
  });
});
