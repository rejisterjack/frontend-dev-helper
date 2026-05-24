import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectPRFromUrl,
  validateToken,
  postPRComment,
  formatAuditAsGitHubComment,
} from '@/lib/github-service';
import type { AuditResult } from '@/lib/export-service';

describe('github-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectPRFromUrl', () => {
    it('parses valid GitHub PR URL', () => {
      const result = detectPRFromUrl('https://github.com/facebook/react/pull/12345');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        prNumber: 12345,
      });
    });

    it('returns null for non-PR URLs', () => {
      expect(detectPRFromUrl('https://github.com/facebook/react')).toBeNull();
      expect(detectPRFromUrl('https://github.com/facebook/react/issues/123')).toBeNull();
      expect(detectPRFromUrl('https://example.com')).toBeNull();
      expect(detectPRFromUrl('')).toBeNull();
    });
  });

  describe('validateToken', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('returns username on success', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ login: 'testuser' }),
          { status: 200 },
        ),
      );

      const result = await validateToken('ghp_testtoken');
      expect(result.valid).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('returns error on failure', async () => {
      mockFetch.mockResolvedValue(
        new Response('Unauthorized', { status: 401 }),
      );

      const result = await validateToken('bad-token');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('401');
    });

    it('returns error when token is empty', async () => {
      const result = await validateToken('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('postPRComment', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    it('posts comment successfully', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ html_url: 'https://github.com/owner/repo/issues/1#issuecomment-123' }),
          { status: 201 },
        ),
      );

      const result = await postPRComment(
        'ghp_test',
        { owner: 'owner', repo: 'repo', prNumber: 1 },
        'Test comment',
      );

      expect(result.success).toBe(true);
      expect(result.url).toContain('github.com');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/issues/1/comments'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  describe('formatAuditAsGitHubComment', () => {
    it('generates valid markdown', () => {
      const auditResult: AuditResult = {
        url: 'https://example.com',
        timestamp: Date.now(),
        overallScore: 75,
        categories: {
          accessibility: {
            score: 80,
            issues: [
              {
                severity: 'critical',
                category: 'accessibility',
                title: 'Missing alt text',
                description: 'Images without alt text',
                selector: 'img.hero',
                suggestedFix: 'Add alt attribute',
              },
            ],
          },
          performance: { score: 90, issues: [] },
          seo: { score: 70, issues: [] },
          bestPractices: { score: 85, issues: [] },
          css: { score: 95, issues: [] },
        },
      };

      const markdown = formatAuditAsGitHubComment(auditResult);

      expect(markdown).toContain('FDH Audit Report');
      expect(markdown).toContain('https://example.com');
      expect(markdown).toContain('75/100');
      expect(markdown).toContain('Missing alt text');
      expect(markdown).toContain('| Category | Score | Issues |');
      expect(markdown).toContain('Frontend Dev Helper');
    });
  });
});
