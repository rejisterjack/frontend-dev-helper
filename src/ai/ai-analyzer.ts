/**
 * AI Analysis Engine
 *
 * Smart detection algorithms for identifying issues and providing suggestions.
 * Analyzes the page for accessibility, performance, SEO, and best practice issues.
 */

import type {
  AIAnalysisResult,
  AISuggestion,
  AISuggestionCategory,
  LLMPageContext,
  LLMSuggestion,
} from '@/types';
import { hasVeryLowContrast } from '@/utils/color-parser';
import { logger } from '@/utils/logger';
import { sendMessage } from '@/utils/messaging';

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
  // Sampling settings for large DOMs
  sampling: {
    // Maximum elements to check per query (for performance)
    maxElementsPerQuery: 200,
    // Sample every Nth element when DOM is large
    sampleRate: 1, // 1 = check all, 2 = check every 2nd, etc.
    // Enable sampling for DOMs larger than this
    enableSamplingThreshold: 1000,
  },
};

// ============================================
// Main Analysis Function
// ============================================

/**
 * Run complete AI analysis on the current page
 * Combines rule-based analysis with LLM-powered suggestions when enabled
 */
export async function runAIAnalysis(): Promise<AIAnalysisResult> {
  const startTime = performance.now();
  logger.log('[AIAnalyzer] Starting analysis...');

  const suggestions: AISuggestion[] = [];

  // Run all analyzers (sequentially to avoid blocking)
  suggestions.push(...(await analyzeAccessibility()));
  suggestions.push(...(await analyzePerformance()));
  suggestions.push(...analyzeSEO());
  suggestions.push(...analyzeBestPractices());
  suggestions.push(...analyzeSecurity());

  // Try to get LLM-powered suggestions
  try {
    const llmSuggestions = await runLLMAnalysis();
    if (llmSuggestions && llmSuggestions.length > 0) {
      // Merge LLM suggestions with rule-based, avoiding duplicates
      const existingSelectors = new Set(suggestions.map((s) => s.selector));
      const uniqueLLMSuggestions = llmSuggestions.filter(
        (s) => !s.selector || !existingSelectors.has(s.selector)
      );
      suggestions.push(...uniqueLLMSuggestions);
      logger.log(`[AIAnalyzer] Added ${uniqueLLMSuggestions.length} LLM-powered suggestions`);
    }
  } catch (error) {
    logger.warn('[AIAnalyzer] LLM analysis failed:', error);
  }

  // Calculate summary
  const summary = calculateSummary(suggestions);

  const duration = performance.now() - startTime;
  logger.log(
    `[AIAnalyzer] Analysis complete in ${duration.toFixed(2)}ms. Found ${suggestions.length} suggestions.`
  );

  return {
    timestamp: Date.now(),
    url: window.location.href,
    suggestions,
    summary,
  };
}

/**
 * Run LLM-powered analysis via the service worker
 */
async function runLLMAnalysis(): Promise<AISuggestion[] | null> {
  // Build page context for LLM
  const context: LLMPageContext = {
    url: window.location.href,
    title: document.title,
    meta: {
      description:
        document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
      viewport:
        document.querySelector('meta[name="viewport"]')?.getAttribute('content') || undefined,
    },
    techStack: detectTechStack(),
    domStats: {
      totalElements: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a').length,
      headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
    },
  };

  // Send request to service worker
  const response = await sendMessage({
    type: 'LLM_ANALYZE_PAGE',
    payload: context,
    timestamp: Date.now(),
  });

  if (!response?.success) {
    return null;
  }

  const responseData = response.data as { suggestions?: LLMSuggestion[] } | undefined;
  if (!responseData?.suggestions) {
    return null;
  }

  // Convert LLM suggestions to AISuggestion format
  return responseData.suggestions.map(
    (s, index): AISuggestion => ({
      id: `llm-${index}`,
      category: s.category,
      priority: s.priority,
      title: s.title,
      description: s.description,
      element: s.element,
      selector: s.selector,
      impact: s.impact,
      effort: s.effort,
      confidence: 0.85, // LLM suggestions have high confidence
      autoFixable: s.autoFixable,
    })
  );
}

/**
 * Detect tech stack from global variables and meta tags
 */
function detectTechStack(): string[] {
  const tech: string[] = [];

  // Check for common frameworks
  if ((window as unknown as Record<string, unknown>).React) tech.push('React');
  if ((window as unknown as Record<string, unknown>).Vue) tech.push('Vue');
  if ((window as unknown as Record<string, unknown>).angular) tech.push('Angular');
  if (document.querySelector('[data-reactroot], [data-reactid]')) tech.push('React');
  if (document.querySelector('[ng-app], [ng-controller]')) tech.push('Angular');
  if (document.querySelector('[data-v-app]')) tech.push('Vue');

  // Check for common libraries
  if ((window as unknown as Record<string, unknown>).jQuery) tech.push('jQuery');
  if ((window as unknown as Record<string, unknown>).$) tech.push('jQuery');
  if (
    (window as unknown as Record<string, unknown>)._ ||
    (window as unknown as Record<string, unknown>).lodash
  )
    tech.push('Lodash');
  if ((window as unknown as Record<string, unknown>).moment) tech.push('Moment.js');
  if ((window as unknown as Record<string, unknown>).gsap) tech.push('GSAP');

  // Check for CSS frameworks
  if (document.querySelector('.tailwind, [class*="tw-"]')) tech.push('Tailwind CSS');
  if (document.querySelector('[class*="bootstrap"]')) tech.push('Bootstrap');
  if (document.querySelector('[class*="material"]')) tech.push('Material UI');

  return tech;
}

// ============================================
// Accessibility Analysis
// ============================================

export async function analyzeAccessibility(): Promise<AISuggestion[]> {
  const suggestions: AISuggestion[] = [];

  // Check for very large DOMs and warn
  const domSize = document.querySelectorAll('*').length;
  const isLargeDom = domSize > ANALYSIS_CONFIG.sampling.enableSamplingThreshold;

  if (isLargeDom) {
    logger.log(
      `[AIAnalyzer] Large DOM detected (${domSize} nodes), using sampling for accessibility analysis`
    );
  }

  // Check images without alt text (with sampling for large DOMs)
  const imagesWithoutAlt = getSampledElements('img:not([alt]):not([aria-hidden="true"])');
  for (let i = 0; i < imagesWithoutAlt.length; i++) {
    const img = imagesWithoutAlt[i];
    suggestions.push({
      id: `a11y-alt-${i}`,
      category: 'accessibility',
      priority: 'high',
      title: 'Image missing alt text',
      description: `Image ${i + 1} is missing alternative text. Screen readers cannot describe this image to visually impaired users.`,
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
  }

  // Yield control after heavy operation
  if (imagesWithoutAlt.length > 50) {
    await yieldControl();
  }

  // Check form inputs without labels (with sampling)
  const formInputs = getSampledElements(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
  );
  for (let i = 0; i < formInputs.length; i++) {
    const input = formInputs[i];
    const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.hasAttribute('aria-label');
    const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
    const hasPlaceholder = (input as HTMLInputElement).placeholder;

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasPlaceholder) {
      suggestions.push({
        id: `a11y-label-${i}`,
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
  }

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
      description:
        'The html element should have a lang attribute to specify the page language for screen readers.',
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
      description:
        'The page has no H1 heading. Every page should have exactly one H1 that describes the main content.',
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

  // Yield control before expensive contrast checks
  await yieldControl();

  // Check for low contrast text (with sampling for large DOMs)
  // Skip detailed contrast analysis for very large DOMs
  if (!shouldSkipDetailedAnalysis()) {
    const textElements = getSampledElements('p, span, a, button, h1, h2, h3, h4, h5, h6, li');
    for (let i = 0; i < textElements.length; i++) {
      const el = textElements[i];
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;

      // Check for very low contrast using proper color parsing
      // Pass element context to resolve CSS variables
      if (hasVeryLowContrast(color, bgColor, el)) {
        suggestions.push({
          id: `a11y-contrast-${i}`,
          category: 'accessibility',
          priority: 'high',
          title: 'Low contrast text',
          description:
            'Text color and background color are too similar, making content difficult to read.',
          element: el.tagName.toLowerCase(),
          selector: generateSelector(el),
          impact: 'Makes text unreadable for many users',
          effort: 'easy',
          confidence: 0.7,
          autoFixable: false,
        });
      }
    }
  }

  // Yield control before focusable elements check
  await yieldControl();

  // Check for focusable elements without focus styles (with sampling)
  const focusableElements = getSampledElements(
    'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  // Limit focus checks to prevent performance issues
  const focusElementsToCheck = focusableElements.slice(0, 100);

  for (let i = 0; i < focusElementsToCheck.length; i++) {
    const el = focusElementsToCheck[i];
    const style = window.getComputedStyle(el);
    const outline = style.outline;

    if (outline === 'none' || outline === '0px') {
      suggestions.push({
        id: `a11y-focus-${i}`,
        category: 'accessibility',
        priority: 'medium',
        title: 'Missing focus indicator',
        description:
          'Interactive element has no visible focus indicator, making keyboard navigation difficult.',
        element: el.tagName.toLowerCase(),
        selector: generateSelector(el),
        impact: 'Keyboard users cannot see which element is focused',
        effort: 'easy',
        confidence: 0.6,
        autoFixable: false,
      });
    }
  }

  // Check for empty links (with sampling)
  const links = getSampledElements('a');
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const text = link.textContent?.trim();
    const hasAriaLabel = link.hasAttribute('aria-label');
    const hasTitle = link.hasAttribute('title');
    const hasImg = link.querySelector('img');

    if (!text && !hasAriaLabel && !hasTitle && !hasImg) {
      suggestions.push({
        id: `a11y-empty-link-${i}`,
        category: 'accessibility',
        priority: 'high',
        title: 'Empty link',
        description:
          'Link has no text content or accessible label. Screen readers cannot describe this link.',
        element: 'a',
        selector: generateSelector(link),
        impact: 'Screen reader users cannot understand link purpose',
        effort: 'easy',
        confidence: 0.95,
        autoFixable: false,
      });
    }
  }

  return suggestions;
}

// ============================================
// Performance Analysis
// ============================================

export async function analyzePerformance(): Promise<AISuggestion[]> {
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
    Array.from(el.children).forEach((child) => getDepth(child, depth + 1));
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

  // Check for unoptimized images (with sampling for large DOMs)
  const images = getSampledElements('img');
  for (let i = 0; i < images.length; i++) {
    const img = images[i] as HTMLImageElement;

    if (
      img.naturalWidth > ANALYSIS_CONFIG.imageThresholds.maxDimensions ||
      img.naturalHeight > ANALYSIS_CONFIG.imageThresholds.maxDimensions
    ) {
      suggestions.push({
        id: `perf-image-large-${i}`,
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

    // Check for images without lazy loading (limit to visible viewport check)
    if (i < 50) {
      // Only check first 50 images for lazy loading
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight && !img.loading && !img.hasAttribute('loading')) {
        suggestions.push({
          id: `perf-image-lazy-${i}`,
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
    }

    // Check for missing dimensions
    if (!img.width && !img.height && !img.style.width && !img.style.height) {
      suggestions.push({
        id: `perf-image-dims-${i}`,
        category: 'performance',
        priority: 'low',
        title: 'Image missing dimensions',
        description:
          'Image should have explicit width and height attributes to prevent layout shift.',
        element: 'img',
        selector: generateSelector(img),
        impact: 'Cumulative Layout Shift (CLS)',
        effort: 'easy',
        confidence: 0.9,
        autoFixable: false,
      });
    }
  }

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

  // Check for inline styles (with sampling for large DOMs)
  const inlineStyles = getSampledElements('[style]');
  // Scale threshold based on sampling
  const sampleRate = Math.max(1, Math.ceil(domSize / ANALYSIS_CONFIG.sampling.maxElementsPerQuery));
  const adjustedThreshold = ANALYSIS_CONFIG.performanceThresholds.maxInlineStyles * sampleRate;

  if (inlineStyles.length > adjustedThreshold) {
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

export function analyzeSEO(): AISuggestion[] {
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

export function analyzeBestPractices(): AISuggestion[] {
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

  // Check for target="_blank" without rel="noopener" (with sampling)
  const externalLinks = getSampledElements('a[target="_blank"]');
  for (let i = 0; i < externalLinks.length; i++) {
    const link = externalLinks[i];
    const rel = link.getAttribute('rel') || '';
    if (!rel.includes('noopener') && !rel.includes('noreferrer')) {
      suggestions.push({
        id: `bp-opener-${i}`,
        category: 'best-practice',
        priority: 'high',
        title: 'Unsafe external link',
        description:
          'Links with target="_blank" should include rel="noopener noreferrer" for security.',
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
  }

  // Check for mixed content (HTTP resources on HTTPS page) - with sampling
  if (window.location.protocol === 'https:') {
    const mixedContentElements = getSampledElements(
      'img[src^="http:"], script[src^="http:"], link[href^="http:"]'
    );
    for (let i = 0; i < mixedContentElements.length; i++) {
      const el = mixedContentElements[i];
      suggestions.push({
        id: `bp-mixed-content-${i}`,
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
    }
  }

  // Check for deprecated elements (with sampling)
  const deprecatedElements = getSampledElements('center, font, marquee, blink, big, strike, tt');
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

export function analyzeSecurity(): AISuggestion[] {
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
        description:
          'Password fields should use autocomplete="current-password" or "new-password".',
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
// Color Utilities
// ============================================

// Color parsing utilities are now imported from '@/utils/color-parser'
// Re-exporting hasVeryLowContrast with element context for CSS variable resolution

// ============================================
// DOM Sampling & Batching Utilities
// ============================================

/**
 * Get a sampled list of elements for analysis
 * For large DOMs, samples every Nth element to maintain performance
 */
function getSampledElements(selector: string): Element[] {
  const allElements = document.querySelectorAll(selector);
  const totalCount = allElements.length;

  // If DOM is small enough, return all elements
  if (totalCount <= ANALYSIS_CONFIG.sampling.maxElementsPerQuery) {
    return Array.from(allElements);
  }

  // Calculate sample rate based on DOM size
  const sampleRate = Math.ceil(totalCount / ANALYSIS_CONFIG.sampling.maxElementsPerQuery);

  logger.log(
    `[AIAnalyzer] Sampling ${selector}: ${totalCount} elements, sampling every ${sampleRate}th`
  );

  const sampled: Element[] = [];
  for (let i = 0; i < totalCount; i += sampleRate) {
    sampled.push(allElements[i]);
  }

  return sampled;
}

/**
 * Yield control to the browser to prevent blocking
 */
function yieldControl(): Promise<void> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Check if we should skip analysis for very large DOMs
 */
function shouldSkipDetailedAnalysis(): boolean {
  const domSize = document.querySelectorAll('*').length;
  return domSize > ANALYSIS_CONFIG.sampling.enableSamplingThreshold * 5;
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

// Namespaced export for convenience
export const aiAnalyzer = {
  runAIAnalysis,
  analyzeAccessibility,
  analyzePerformance,
  analyzeSEO,
  analyzeBestPractices,
  analyzeSecurity,
};

// Default export
export default aiAnalyzer;
