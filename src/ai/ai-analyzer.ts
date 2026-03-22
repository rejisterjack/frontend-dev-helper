/**
 * AI Analysis Engine
 *
 * Smart detection algorithms for identifying issues and providing suggestions.
 * Analyzes the page for accessibility, performance, SEO, and best practice issues.
 */

import type { AIAnalysisResult, AISuggestion, AISuggestionCategory } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Configuration
// ============================================

const ANALYSIS_CONFIG = {
  // Contrast ratio thresholds (WCAG)
  contrastThresholds: {
    aa: { normal: 4.5, large: 3 },
    aaa: { normal: 7, large: 4.5 },
  },
  // Image size thresholds
  imageThresholds: {
    maxSize: 500 * 1024, // 500KB
    maxDimensions: 2000,
  },
  // Performance thresholds
  performanceThresholds: {
    maxDomNodes: 1500,
    maxDepth: 32,
    maxInlineStyles: 50,
  },
};

// ============================================
// Main Analysis Function
// ============================================

/**
 * Run complete AI analysis on the current page
 */
export async function runAIAnalysis(): Promise<AIAnalysisResult> {
  const startTime = performance.now();
  logger.log('[AIAnalyzer] Starting analysis...');

  const suggestions: AISuggestion[] = [];

  // Run all analyzers
  suggestions.push(...analyzeAccessibility());
  suggestions.push(...analyzePerformance());
  suggestions.push(...analyzeSEO());
  suggestions.push(...analyzeBestPractices());
  suggestions.push(...analyzeSecurity());

  // Calculate summary
  const summary = calculateSummary(suggestions);

  const duration = performance.now() - startTime;
  logger.log(`[AIAnalyzer] Analysis complete in ${duration.toFixed(2)}ms. Found ${suggestions.length} suggestions.`);

  return {
    timestamp: Date.now(),
    url: window.location.href,
    suggestions,
    summary,
  };
}

// ============================================
// Accessibility Analysis
// ============================================

function analyzeAccessibility(): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check images without alt text
  document.querySelectorAll('img:not([alt]):not([aria-hidden="true"])').forEach((img, index) => {
    suggestions.push({
      id: `a11y-alt-${index}`,
      category: 'accessibility',
      priority: 'high',
      title: 'Image missing alt text',
      description: `Image ${index + 1} is missing alternative text. Screen readers cannot describe this image to visually impaired users.`,
      element: 'img',
      selector: generateSelector(img),
      impact: 'Critical for screen reader users',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: true,
      fix: () => {
        (img as HTMLImageElement).alt = 'Description needed';
        return true;
      },
    });
  });

  // Check form inputs without labels
  document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').forEach((input, index) => {
    const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.hasAttribute('aria-label');
    const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
    const hasPlaceholder = (input as HTMLInputElement).placeholder;

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasPlaceholder) {
      suggestions.push({
        id: `a11y-label-${index}`,
        category: 'accessibility',
        priority: 'high',
        title: 'Form input missing label',
        description: `Input "${(input as HTMLInputElement).name || input.tagName.toLowerCase()}" has no associated label. Screen readers cannot identify the purpose of this field.`,
        element: input.tagName.toLowerCase(),
        selector: generateSelector(input),
        impact: 'Critical for form accessibility',
        effort: 'easy',
        confidence: 0.9,
        autoFixable: false,
      });
    }
  });

  // Check for missing page title
  if (!document.title || document.title.trim().length === 0) {
    suggestions.push({
      id: 'a11y-title',
      category: 'accessibility',
      priority: 'critical',
      title: 'Page missing title',
      description: 'The page has no title element. This is essential for screen readers and SEO.',
      impact: 'Critical for navigation and SEO',
      effort: 'easy',
      confidence: 1,
      autoFixable: false,
    });
  }

  // Check for missing language attribute
  if (!document.documentElement.lang) {
    suggestions.push({
      id: 'a11y-lang',
      category: 'accessibility',
      priority: 'medium',
      title: 'HTML missing lang attribute',
      description: 'The html element should have a lang attribute to specify the page language for screen readers.',
      impact: 'Helps screen readers pronounce content correctly',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: true,
      fix: () => {
        document.documentElement.lang = 'en';
        return true;
      },
    });
  }

  // Check heading hierarchy
  const h1s = document.querySelectorAll('h1');
  if (h1s.length === 0) {
    suggestions.push({
      id: 'a11y-h1-missing',
      category: 'accessibility',
      priority: 'high',
      title: 'Missing H1 heading',
      description: 'The page has no H1 heading. Every page should have exactly one H1 that describes the main content.',
      impact: 'Critical for navigation and SEO',
      effort: 'medium',
      confidence: 0.9,
      autoFixable: false,
    });
  } else if (h1s.length > 1) {
    suggestions.push({
      id: 'a11y-h1-multiple',
      category: 'accessibility',
      priority: 'medium',
      title: 'Multiple H1 headings',
      description: `Found ${h1s.length} H1 headings. A page should have exactly one H1 for proper document structure.`,
      impact: 'Confuses screen reader navigation',
      effort: 'medium',
      confidence: 0.9,
      autoFixable: false,
    });
  }

  // Check for low contrast text
  document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li').forEach((el, index) => {
    const style = window.getComputedStyle(el);
    const color = style.color;
    const bgColor = style.backgroundColor;

    // Simple check for very low contrast (white on white, black on black)
    if (color === bgColor || (color.includes('255') && bgColor.includes('255')) || (color.includes('0, 0, 0') && bgColor.includes('0, 0, 0'))) {
      suggestions.push({
        id: `a11y-contrast-${index}`,
        category: 'accessibility',
        priority: 'high',
        title: 'Low contrast text',
        description: 'Text color and background color are too similar, making content difficult to read.',
        element: el.tagName.toLowerCase(),
        selector: generateSelector(el),
        impact: 'Makes text unreadable for many users',
        effort: 'easy',
        confidence: 0.7,
        autoFixable: false,
      });
    }
  });

  // Check for focusable elements without focus styles
  document.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').forEach((el, index) => {
    const style = window.getComputedStyle(el);
    const outline = style.outline;
    
    if (outline === 'none' || outline === '0px') {
      // Check if there's a custom focus style defined
      const hasCustomFocus = el.matches(':focus') || el.matches(':focus-visible');
      if (!hasCustomFocus) {
        suggestions.push({
          id: `a11y-focus-${index}`,
          category: 'accessibility',
          priority: 'medium',
          title: 'Missing focus indicator',
          description: 'Interactive element has no visible focus indicator, making keyboard navigation difficult.',
          element: el.tagName.toLowerCase(),
          selector: generateSelector(el),
          impact: 'Keyboard users cannot see which element is focused',
          effort: 'easy',
          confidence: 0.6,
          autoFixable: false,
        });
      }
    }
  });

  // Check for empty links
  document.querySelectorAll('a').forEach((link, index) => {
    const text = link.textContent?.trim();
    const hasAriaLabel = link.hasAttribute('aria-label');
    const hasTitle = link.hasAttribute('title');
    const hasImg = link.querySelector('img');

    if (!text && !hasAriaLabel && !hasTitle && !hasImg) {
      suggestions.push({
        id: `a11y-empty-link-${index}`,
        category: 'accessibility',
        priority: 'high',
        title: 'Empty link',
        description: 'Link has no text content or accessible label. Screen readers cannot describe this link.',
        element: 'a',
        selector: generateSelector(link),
        impact: 'Screen reader users cannot understand link purpose',
        effort: 'easy',
        confidence: 0.95,
        autoFixable: false,
      });
    }
  });

  return suggestions;
}

// ============================================
// Performance Analysis
// ============================================

function analyzePerformance(): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check DOM size
  const domSize = document.querySelectorAll('*').length;
  if (domSize > ANALYSIS_CONFIG.performanceThresholds.maxDomNodes) {
    suggestions.push({
      id: 'perf-dom-size',
      category: 'performance',
      priority: 'high',
      title: 'Excessive DOM size',
      description: `Page has ${domSize.toLocaleString()} DOM nodes (recommended max: ${ANALYSIS_CONFIG.performanceThresholds.maxDomNodes}). Large DOMs slow down rendering and interactions.`,
      impact: 'Slows down page rendering and JavaScript execution',
      effort: 'hard',
      confidence: 0.95,
      autoFixable: false,
    });
  }

  // Check DOM depth
  let maxDepth = 0;
  const getDepth = (el: Element, depth: number): void => {
    maxDepth = Math.max(maxDepth, depth);
    Array.from(el.children).forEach(child => getDepth(child, depth + 1));
  };
  getDepth(document.body, 1);

  if (maxDepth > ANALYSIS_CONFIG.performanceThresholds.maxDepth) {
    suggestions.push({
      id: 'perf-dom-depth',
      category: 'performance',
      priority: 'medium',
      title: 'Deep DOM nesting',
      description: `Maximum DOM depth is ${maxDepth} levels (recommended max: ${ANALYSIS_CONFIG.performanceThresholds.maxDepth}). Deep nesting hurts performance.`,
      impact: 'Increases layout and style calculation time',
      effort: 'hard',
      confidence: 0.9,
      autoFixable: false,
    });
  }

  // Check for unoptimized images
  document.querySelectorAll('img').forEach((img, index) => {
    if (img.naturalWidth > ANALYSIS_CONFIG.imageThresholds.maxDimensions ||
        img.naturalHeight > ANALYSIS_CONFIG.imageThresholds.maxDimensions) {
      suggestions.push({
        id: `perf-image-large-${index}`,
        category: 'performance',
        priority: 'medium',
        title: 'Oversized image',
        description: `Image is ${img.naturalWidth}x${img.naturalHeight}px. Large images should be resized and optimized.`,
        element: 'img',
        selector: generateSelector(img),
        impact: 'Slows down page load significantly',
        effort: 'medium',
        confidence: 0.8,
        autoFixable: false,
      });
    }

    // Check for images without lazy loading
    const rect = img.getBoundingClientRect();
    if (rect.top > window.innerHeight && !img.loading && !img.hasAttribute('loading')) {
      suggestions.push({
        id: `perf-image-lazy-${index}`,
        category: 'performance',
        priority: 'medium',
        title: 'Image missing lazy loading',
        description: 'Off-screen image should use loading="lazy" for better performance.',
        element: 'img',
        selector: generateSelector(img),
        impact: 'Unnecessary initial page load time',
        effort: 'easy',
        confidence: 0.85,
        autoFixable: true,
        fix: () => {
          img.loading = 'lazy';
          return true;
        },
      });
    }

    // Check for missing dimensions
    if (!img.width && !img.height && !img.style.width && !img.style.height) {
      suggestions.push({
        id: `perf-image-dims-${index}`,
        category: 'performance',
        priority: 'low',
        title: 'Image missing dimensions',
        description: 'Image should have explicit width and height attributes to prevent layout shift.',
        element: 'img',
        selector: generateSelector(img),
        impact: 'Cumulative Layout Shift (CLS)',
        effort: 'easy',
        confidence: 0.9,
        autoFixable: false,
      });
    }
  });

  // Check for render-blocking resources
  const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([async])');
  if (stylesheets.length > 3) {
    suggestions.push({
      id: 'perf-render-blocking',
      category: 'performance',
      priority: 'medium',
      title: 'Multiple render-blocking stylesheets',
      description: `${stylesheets.length} stylesheets may block rendering. Consider inlining critical CSS or using media queries.`,
      impact: 'Delays First Contentful Paint',
      effort: 'medium',
      confidence: 0.75,
      autoFixable: false,
    });
  }

  // Check for inline styles
  const inlineStyles = document.querySelectorAll('[style]');
  if (inlineStyles.length > ANALYSIS_CONFIG.performanceThresholds.maxInlineStyles) {
    suggestions.push({
      id: 'perf-inline-styles',
      category: 'performance',
      priority: 'low',
      title: 'Excessive inline styles',
      description: `${inlineStyles.length} elements use inline styles. Moving styles to CSS files improves caching.`,
      impact: 'Increases HTML size, harder to maintain',
      effort: 'medium',
      confidence: 0.7,
      autoFixable: false,
    });
  }

  return suggestions;
}

// ============================================
// SEO Analysis
// ============================================

function analyzeSEO(): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    suggestions.push({
      id: 'seo-meta-description',
      category: 'seo',
      priority: 'high',
      title: 'Missing meta description',
      description: 'Page is missing a meta description. This is crucial for search engine results.',
      impact: 'Reduces click-through rate from search results',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: false,
    });
  } else {
    const content = metaDesc.getAttribute('content') || '';
    if (content.length < 50) {
      suggestions.push({
        id: 'seo-meta-short',
        category: 'seo',
        priority: 'medium',
        title: 'Meta description too short',
        description: `Meta description is only ${content.length} characters. Recommended: 150-160 characters.`,
        impact: 'Less compelling in search results',
        effort: 'easy',
        confidence: 0.9,
        autoFixable: false,
      });
    } else if (content.length > 160) {
      suggestions.push({
        id: 'seo-meta-long',
        category: 'seo',
        priority: 'low',
        title: 'Meta description too long',
        description: `Meta description is ${content.length} characters. May be truncated in search results.`,
        impact: 'Important content may be cut off',
        effort: 'easy',
        confidence: 0.85,
        autoFixable: false,
      });
    }
  }

  // Check for viewport meta tag
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    suggestions.push({
      id: 'seo-viewport',
      category: 'seo',
      priority: 'high',
      title: 'Missing viewport meta tag',
      description: 'Page is missing the viewport meta tag needed for mobile responsiveness.',
      impact: 'Critical for mobile SEO and usability',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: true,
      fix: () => {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1';
        document.head.appendChild(meta);
        return true;
      },
    });
  }

  // Check title length
  if (document.title.length > 60) {
    suggestions.push({
      id: 'seo-title-long',
      category: 'seo',
      priority: 'medium',
      title: 'Title tag too long',
      description: `Title is ${document.title.length} characters. May be truncated in search results (recommended: 50-60).`,
      impact: 'Important keywords may be cut off',
      effort: 'easy',
      confidence: 0.85,
      autoFixable: false,
    });
  }

  // Check for canonical link
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    suggestions.push({
      id: 'seo-canonical',
      category: 'seo',
      priority: 'medium',
      title: 'Missing canonical URL',
      description: 'Page should have a canonical link to prevent duplicate content issues.',
      impact: 'May cause duplicate content penalties',
      effort: 'easy',
      confidence: 0.8,
      autoFixable: false,
    });
  }

  // Check for Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    suggestions.push({
      id: 'seo-og-title',
      category: 'seo',
      priority: 'low',
      title: 'Missing Open Graph title',
      description: 'Add og:title meta tag for better social media sharing.',
      impact: 'Preview may not display correctly on social media',
      effort: 'easy',
      confidence: 0.75,
      autoFixable: false,
    });
  }

  // Check for structured data
  const structuredData = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredData.length === 0) {
    suggestions.push({
      id: 'seo-structured-data',
      category: 'seo',
      priority: 'low',
      title: 'No structured data',
      description: 'Consider adding JSON-LD structured data for rich search results.',
      impact: 'Missed opportunity for rich snippets',
      effort: 'medium',
      confidence: 0.7,
      autoFixable: false,
    });
  }

  return suggestions;
}

// ============================================
// Best Practices Analysis
// ============================================

function analyzeBestPractices(): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check for doctype
  if (!document.doctype) {
    suggestions.push({
      id: 'bp-doctype',
      category: 'best-practice',
      priority: 'high',
      title: 'Missing DOCTYPE',
      description: 'Page should have a DOCTYPE declaration for standards mode rendering.',
      impact: 'May trigger quirks mode in browsers',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: false,
    });
  }

  // Check for charset
  const charset = document.querySelector('meta[charset]');
  if (!charset) {
    suggestions.push({
      id: 'bp-charset',
      category: 'best-practice',
      priority: 'high',
      title: 'Missing character encoding',
      description: 'Page should specify character encoding (UTF-8 recommended).',
      impact: 'May cause character rendering issues',
      effort: 'easy',
      confidence: 0.95,
      autoFixable: true,
      fix: () => {
        const meta = document.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        document.head.insertBefore(meta, document.head.firstChild);
        return true;
      },
    });
  }

  // Check for console statements in production
  // This is informational only since we can't detect console usage easily

  // Check for target="_blank" without rel="noopener"
  document.querySelectorAll('a[target="_blank"]').forEach((link, index) => {
    const rel = link.getAttribute('rel') || '';
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
      suggestions.push({
        id: `bp-opener-${index}`,
        category: 'best-practice',
        priority: 'high',
        title: 'Unsafe external link',
        description: 'Links with target="_blank" should include rel="noopener noreferrer" for security.',
        element: 'a',
        selector: generateSelector(link),
        impact: 'Security vulnerability (tabnabbing)',
        effort: 'easy',
        confidence: 0.9,
        autoFixable: true,
        fix: () => {
          link.setAttribute('rel', 'noopener noreferrer');
          return true;
        },
      });
    }
  });

  // Check for mixed content (HTTP resources on HTTPS page)
  if (window.location.protocol === 'https:') {
    document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').forEach((el, index) => {
      suggestions.push({
        id: `bp-mixed-content-${index}`,
        category: 'best-practice',
        priority: 'high',
        title: 'Mixed content',
        description: 'Loading HTTP resources on HTTPS page is blocked by browsers.',
        element: el.tagName.toLowerCase(),
        selector: generateSelector(el),
        impact: 'Resources will be blocked by browser',
        effort: 'medium',
        confidence: 0.95,
        autoFixable: false,
      });
    });
  }

  // Check for deprecated elements
  const deprecatedElements = document.querySelectorAll('center, font, marquee, blink, big, strike, tt');
  if (deprecatedElements.length > 0) {
    suggestions.push({
      id: 'bp-deprecated',
      category: 'best-practice',
      priority: 'medium',
      title: 'Deprecated HTML elements',
      description: `Found ${deprecatedElements.length} deprecated HTML element(s). Use CSS instead.`,
      impact: 'Outdated code, may not be supported',
      effort: 'medium',
      confidence: 0.95,
      autoFixable: false,
    });
  }

  return suggestions;
}

// ============================================
// Security Analysis
// ============================================

function analyzeSecurity(): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  // Check for HTTPS
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    suggestions.push({
      id: 'sec-https',
      category: 'security',
      priority: 'critical',
      title: 'Not using HTTPS',
      description: 'Page is not served over HTTPS. This is a security risk.',
      impact: 'Data can be intercepted, SEO penalty',
      effort: 'medium',
      confidence: 0.95,
      autoFixable: false,
    });
  }

  // Check for password fields without autocomplete
  document.querySelectorAll('input[type="password"]').forEach((input, index) => {
    const autocomplete = input.getAttribute('autocomplete');
    if (!autocomplete || autocomplete === 'on') {
      suggestions.push({
        id: `sec-password-${index}`,
        category: 'security',
        priority: 'medium',
        title: 'Password field missing autocomplete',
        description: 'Password fields should use autocomplete="current-password" or "new-password".',
        element: 'input',
        selector: generateSelector(input),
        impact: 'Password managers may not work correctly',
        effort: 'easy',
        confidence: 0.75,
        autoFixable: false,
      });
    }
  });

  return suggestions;
}

// ============================================
// Utilities
// ============================================

function calculateSummary(suggestions: AISuggestion[]) {
  const byCategory: Record<AISuggestionCategory, number> = {
    accessibility: 0,
    performance: 0,
    seo: 0,
    'best-practice': 0,
    security: 0,
  };

  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let autoFixable = 0;

  suggestions.forEach((s) => {
    byCategory[s.category]++;

    switch (s.priority) {
      case 'critical':
        critical++;
        break;
      case 'high':
        high++;
        break;
      case 'medium':
        medium++;
        break;
      case 'low':
        low++;
        break;
    }

    if (s.autoFixable) {
      autoFixable++;
    }
  });

  return {
    total: suggestions.length,
    critical,
    high,
    medium,
    low,
    autoFixable,
    byCategory,
  };
}

function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  if (el.className) return `.${el.className.split(' ')[0]}`;
  return el.tagName.toLowerCase();
}

// ============================================
// Export
// ============================================

export const aiAnalyzer = {
  runAIAnalysis,
  analyzeAccessibility,
  analyzePerformance,
  analyzeSEO,
  analyzeBestPractices,
  analyzeSecurity,
};
