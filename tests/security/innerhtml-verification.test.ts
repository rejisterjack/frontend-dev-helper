/**
 * innerHTML Security Verification
 *
 * Verifies that all source files with innerHTML assignments import from the
 * central sanitize utility, ensuring no duplicate local escapeHtml functions
 * and consistent XSS protection across the codebase.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { escapeHtml, sanitizeColor } from '@/utils/sanitize';

/**
 * Recursively collect all .ts files under a directory.
 */
function collectTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('innerHTML Security Verification', () => {
  const contentDir = path.join(__dirname, '../../src/content');

  describe('Sanitization Coverage', () => {
    it('should have escapeHtml from @/utils/sanitize in every file that uses innerHTML', () => {
      const allFiles = collectTsFiles(contentDir);
      const violations: string[] = [];

      for (const filePath of allFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Only check files that actually assign to innerHTML
        if (!content.includes('.innerHTML')) continue;

        const hasImport =
          content.includes("from '@/utils/sanitize'") ||
          content.includes('from "@/utils/sanitize"');

        // A local escapeHtml definition is a violation — it means it wasn't
        // consolidated into the central utility
        const hasLocalDuplicate =
          content.includes('function escapeHtml(') ||
          content.includes('const escapeHtml =');

        const relative = path.relative(contentDir, filePath);

        if (hasLocalDuplicate) {
          violations.push(`${relative}: has a local duplicate escapeHtml — use @/utils/sanitize instead`);
        }

        // If innerHTML is used with template literals interpolating variables,
        // the file must import from sanitize
        const hasInterpolatedInnerHtml = /\.innerHTML\s*=\s*`[^`]*\$\{/.test(content);
        if (hasInterpolatedInnerHtml && !hasImport) {
          violations.push(`${relative}: interpolates values into innerHTML without importing from @/utils/sanitize`);
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('XSS Prevention Patterns', () => {
    it('should escape dynamic content in templates', () => {
      // Payloads with HTML special characters — these must be escaped
      const htmlPayloads = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '" onclick="alert(1)"',
        '\'><svg onload=alert(1)>',
      ];

      htmlPayloads.forEach(payload => {
        const escaped = escapeHtml(payload);
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('<img');
        expect(escaped).toContain('&');
      });
    });

    it('should sanitize color values', () => {
      // sanitizeColor returns null for invalid/malicious colors — null is the safe outcome
      const malicious = '#ff0000" onclick="alert(1)"';
      const sanitized = sanitizeColor(malicious);
      expect(sanitized).toBeNull();
    });
  });
});
