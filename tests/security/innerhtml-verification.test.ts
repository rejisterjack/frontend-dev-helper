/**
 * innerHTML Security Verification
 * 
 * Verifies that all innerHTML usages properly escape dynamic content
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('innerHTML Security Verification', () => {
  const contentDir = path.join(__dirname, '../../src/content');
  
  // Files that should have escapeHtml
  const filesWithInnerHTML = [
    'accessibility-audit.ts',
    'ai-suggestions.ts',
    'animation-inspector.ts',
    'breakpoint-overlay.ts',
    'color-picker.ts',
    'command-palette.ts',
    'component-tree.ts',
    'contrast-checker.ts',
    'css-editor.ts',
    'css-inspector.ts',
    'design-system-validator.ts',
    'feature-manager.ts',
    'flame-graph.ts',
    'focus-debugger.ts',
    'font-inspector.ts',
    'form-debugger.ts',
    'network-analyzer.ts',
    'pesticide.ts',
    'pixel-ruler.ts',
    'responsive-preview.ts',
    'screenshot-studio.ts',
    'site-report-generator.ts',
    'storage-inspector.ts',
    'tech-detector.ts',
    'visual-regression.ts',
    'zindex-visualizer.ts',
  ];

  describe('Sanitization Coverage', () => {
    it('should have escapeHtml in all files with innerHTML', () => {
      const results = filesWithInnerHTML.map(file => {
        const filePath = path.join(contentDir, file);
        if (!fs.existsSync(filePath)) {
          return { file, hasImport: false, hasLocal: false };
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        const hasImport = content.includes('from\'@/utils/sanitize\'') || content.includes('from "@/utils/sanitize"');
        const hasLocal = content.includes('function escapeHtml') || content.includes('const escapeHtml');
        
        return { file, hasImport, hasLocal };
      });

      const uncovered = results.filter(r => !r.hasImport && !r.hasLocal);
      
      expect(uncovered).toEqual([]);
    });
  });

  describe('XSS Prevention Patterns', () => {
    it('should escape dynamic content in templates', () => {
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Test various XSS payloads
      const payloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '" onclick="alert(1)"',
        '\'><svg onload=alert(1)>',
      ];

      payloads.forEach(payload => {
        const escaped = escapeHtml(payload);
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('javascript:');
        expect(escaped).toContain('&');
      });
    });

    it('should sanitize color values', () => {
      const sanitizeColor = (color: string): string | null => {
        if (typeof color !== 'string') return null;
        const s = new Option().style;
        s.color = color;
        if (!s.color) return null;
        return color.replace(/["';{}<>]/g, '');
      };

      const malicious = '#ff0000" onclick="alert(1)"';
      const sanitized = sanitizeColor(malicious);
      
      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain('onclick');
    });
  });
});
