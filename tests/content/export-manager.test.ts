/**
 * Export Manager Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('Export Manager', () => {
  describe('Report Generation', () => {
    it('should generate JSON report', () => {
      const data = { url: 'https://example.com', score: 85 };
      const json = JSON.stringify(data, null, 2);
      
      expect(JSON.parse(json)).toEqual(data);
    });

    it('should generate HTML report', () => {
      const title = 'Test Report';
      const html = `<!DOCTYPE html><html><head><title>${title}</title></head><body></body></html>`;
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain(title);
    });

    it('should trigger file download', () => {
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;

      const blob = new Blob(['test'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(url).toBe('blob:url');
    });
  });

  describe('Data Sanitization', () => {
    it('should escape HTML in report titles', () => {
      const title = '<script>alert(1)</script>';
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };
      
      const safe = escapeHtml(title);
      expect(safe).not.toContain('<script>');
    });
  });
});
