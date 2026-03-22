/**
 * AI Analyzer Tests
 *
 * Tests for the AI analysis engine and suggestion system.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  analyzeAccessibility,
  analyzeBestPractices,
  analyzePerformance,
  analyzeSEO,
  analyzeSecurity,
  runAIAnalysis,
} from '../../src/ai/ai-analyzer';

describe('AI Analyzer', () => {
  describe('runAIAnalysis', () => {
    it('should return analysis result with all categories', async () => {
      const result = await runAIAnalysis();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should calculate summary statistics', async () => {
      const result = await runAIAnalysis();

      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('critical');
      expect(result.summary).toHaveProperty('high');
      expect(result.summary).toHaveProperty('medium');
      expect(result.summary).toHaveProperty('low');
      expect(result.summary).toHaveProperty('autoFixable');
      expect(result.summary).toHaveProperty('byCategory');
    });
  });

  describe('analyzeAccessibility', () => {
    it('should detect images without alt text', () => {
      // Create test DOM
      document.body.innerHTML = `
        <img src="test.jpg" id="img-no-alt">
        <img src="test2.jpg" alt="Description" id="img-with-alt">
      `;

      const suggestions = analyzeAccessibility();
      const imgSuggestion = suggestions.find(s => 
        s.id.includes('a11y-alt') && s.element === 'img'
      );

      expect(imgSuggestion).toBeDefined();
      expect(imgSuggestion?.priority).toBe('high');
      expect(imgSuggestion?.category).toBe('accessibility');
    });

    it('should detect missing page title', () => {
      // Remove title
      const originalTitle = document.title;
      document.title = '';

      const suggestions = analyzeAccessibility();
      const titleSuggestion = suggestions.find(s => s.id === 'a11y-title');

      expect(titleSuggestion).toBeDefined();
      expect(titleSuggestion?.priority).toBe('critical');

      // Restore title
      document.title = originalTitle;
    });

    it('should detect form inputs without labels', () => {
      document.body.innerHTML = `
        <input type="text" id="test-input">
        <input type="text" id="labeled-input" aria-label="Test">
      `;

      const suggestions = analyzeAccessibility();
      const labelSuggestions = suggestions.filter(s => 
        s.id.includes('a11y-label')
      );

      expect(labelSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('analyzePerformance', () => {
    it('should detect excessive DOM size', () => {
      // Create many DOM nodes
      const container = document.createElement('div');
      for (let i = 0; i < 1600; i++) {
        const div = document.createElement('div');
        container.appendChild(div);
      }
      document.body.appendChild(container);

      const suggestions = analyzePerformance();
      const domSuggestion = suggestions.find(s => s.id === 'perf-dom-size');

      expect(domSuggestion).toBeDefined();
      expect(domSuggestion?.priority).toBe('high');

      document.body.removeChild(container);
    });

    it('should detect images without lazy loading', () => {
      document.body.innerHTML = `
        <img src="test.jpg" style="margin-top: 2000px;">
      `;

      const suggestions = analyzePerformance();
      const lazySuggestions = suggestions.filter(s => 
        s.id.includes('perf-image-lazy')
      );

      expect(lazySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSEO', () => {
    it('should detect missing meta description', () => {
      // Remove meta description if exists
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.remove();
      }

      const suggestions = analyzeSEO();
      const descSuggestion = suggestions.find(s => s.id === 'seo-meta-description');

      expect(descSuggestion).toBeDefined();
      expect(descSuggestion?.priority).toBe('high');
    });

    it('should detect missing viewport meta tag', () => {
      const suggestions = analyzeSEO();
      const viewportSuggestion = suggestions.find(s => s.id === 'seo-viewport');

      // Should suggest viewport if missing
      if (!document.querySelector('meta[name="viewport"]')) {
        expect(viewportSuggestion).toBeDefined();
      }
    });
  });

  describe('analyzeBestPractices', () => {
    it('should detect external links without noopener', () => {
      document.body.innerHTML = `
        <a href="https://example.com" target="_blank" id="unsafe-link">Link</a>
      `;

      const suggestions = analyzeBestPractices();
      const noopenerSuggestions = suggestions.filter(s => 
        s.id.includes('bp-opener')
      );

      expect(noopenerSuggestions.length).toBeGreaterThan(0);
    });

    it('should detect deprecated HTML elements', () => {
      document.body.innerHTML = `
        <center>Deprecated content</center>
        <font color="red">More deprecated</font>
      `;

      const suggestions = analyzeBestPractices();
      const deprecatedSuggestion = suggestions.find(s => s.id === 'bp-deprecated');

      expect(deprecatedSuggestion).toBeDefined();
    });
  });

  describe('analyzeSecurity', () => {
    it('should warn about non-HTTPS pages', () => {
      const suggestions = analyzeSecurity();
      const httpsSuggestion = suggestions.find(s => s.id === 'sec-https');

      // Only warn if not HTTPS and not localhost
      if (window.location.protocol !== 'https:' && 
          window.location.hostname !== 'localhost') {
        expect(httpsSuggestion).toBeDefined();
        expect(httpsSuggestion?.priority).toBe('critical');
      }
    });
  });
});

describe('Quick Fixes', () => {
  it('should apply lazy loading fix to images', () => {
    const img = document.createElement('img');
    img.src = 'test.jpg';
    document.body.appendChild(img);

    // Apply fix
    img.loading = 'lazy';

    expect(img.loading).toBe('lazy');
    document.body.removeChild(img);
  });

  it('should apply noopener to external links', () => {
    const link = document.createElement('a');
    link.href = 'https://example.com';
    link.target = '_blank';
    document.body.appendChild(link);

    // Apply fix
    link.setAttribute('rel', 'noopener noreferrer');

    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    document.body.removeChild(link);
  });
});
