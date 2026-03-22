/**
 * Site Report Generator Types
 */

import type { AccessibilityReport, MemoryInfo } from '../../types';

/** Comprehensive site report */
export interface SiteReport {
  id: string;
  timestamp: number;
  url: string;
  title: string;
  scores: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
    overall: number;
  };
  performance: PerformanceReport | null;
  accessibility: AccessibilityReport | null;
  colors: ColorReport | null;
  seo: SEOReport | null;
  techStack: TechStackReport | null;
  bestPractices: BestPracticesReport | null;
  recommendations: Recommendation[];
}

export interface PerformanceReport {
  webVitals: {
    lcp: MetricScore;
    fid: MetricScore;
    cls: MetricScore;
    fcp: MetricScore;
    ttfb: MetricScore;
    inp: MetricScore;
  };
  navigation: {
    dnsLookup: number;
    tcpConnection: number;
    tlsHandshake: number;
    serverResponse: number;
    domProcessing: number;
    resourceLoading: number;
    totalLoad: number;
  };
  resources: {
    totalRequests: number;
    totalSize: number;
    transferSize: number;
    byType: Record<string, number>;
    slowestResources: SlowResource[];
    renderBlocking: RenderBlockingResource[];
  };
  memory: MemoryInfo | null;
  imageOptimizations: ImageOptimization[];
}

export interface MetricScore {
  value: number | null;
  unit: string;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface SlowResource {
  url: string;
  type: string;
  duration: number;
  size: number;
}

export interface RenderBlockingResource {
  url: string;
  type: 'stylesheet' | 'script';
  size: number;
  blockingTime: number;
}

export interface ImageOptimization {
  url: string;
  currentSize: number;
  currentFormat: string;
  displayWidth: number;
  displayHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  recommendations: string[];
  potentialSavings: number;
}

export interface ColorReport {
  totalColors: number;
  dominant: ColorInfo[];
  harmonies: {
    complementary: string[];
    analogous: string[];
    triadic: string[];
    splitComplementary: string[];
    tetradic: string[];
    monochromatic: string[];
  };
  categories: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
    semantic: {
      success: string[];
      warning: string[];
      error: string[];
      info: string[];
    };
  };
  contrastIssues: ContrastIssue[];
}

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  frequency: number;
}

export interface ContrastIssue {
  element: string;
  selector: string;
  foreground: string;
  background: string;
  ratio: number;
  requiredRatio: number;
  severity: 'error' | 'warning';
}

export interface SEOReport {
  score: number;
  meta: MetaAnalysis;
  headings: HeadingsAnalysis;
  links: LinksAnalysis;
  images: ImagesAnalysis;
  mobile: MobileAnalysis;
  structuredData: StructuredDataAnalysis;
  content: ContentAnalysis;
}

export interface MetaAnalysis {
  hasTitle: boolean;
  titleLength: number;
  titleQuality: 'good' | 'too-short' | 'too-long';
  hasDescription: boolean;
  descriptionLength: number;
  hasViewport: boolean;
  hasCharset: boolean;
  hasCanonical: boolean;
  hasRobots: boolean;
  hasOGTags: boolean;
  hasTwitterCards: boolean;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  issues: string[];
}

export interface HeadingsAnalysis {
  h1: { count: number; texts: string[] };
  h2: { count: number; texts: string[] };
  h3: { count: number; texts: string[] };
  h4: { count: number; texts: string[] };
  h5: { count: number; texts: string[] };
  h6: { count: number; texts: string[] };
  structure: 'good' | 'multiple-h1' | 'missing-h1' | 'skipped-levels';
  issues: string[];
}

export interface LinksAnalysis {
  total: number;
  internal: number;
  external: number;
  broken: number;
  nofollow: number;
  newWindow: number;
  withoutAriaLabel: number;
  issues: string[];
}

export interface ImagesAnalysis {
  total: number;
  withoutAlt: number;
  oversized: number;
  lazyLoaded: number;
  issues: string[];
}

export interface MobileAnalysis {
  hasViewport: boolean;
  viewportContent: string | null;
  hasTouchTargets: boolean;
  smallTouchTargets: number;
  usesFixedPosition: boolean;
  fontSizeReadable: boolean;
  issues: string[];
}

export interface StructuredDataAnalysis {
  hasJsonLd: boolean;
  hasMicrodata: boolean;
  hasRdfa: boolean;
  types: string[];
  count: number;
  issues: string[];
}

export interface ContentAnalysis {
  wordCount: number;
  paragraphCount: number;
  avgWordsPerParagraph: number;
  hasDuplicateContent: boolean;
  readabilityScore: number;
  issues: string[];
}

export interface TechStackReport {
  frameworks: string[];
  libraries: string[];
  analytics: string[];
  cms: string | null;
  hosting: string | null;
  cdn: string | null;
  server: string | null;
}

export interface BestPracticesReport {
  https: boolean;
  http2: boolean;
  hsts: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  csp: boolean;
  features: {
    serviceWorker: boolean;
    manifest: boolean;
    https: boolean;
    http2: boolean;
  };
  issues: string[];
}

export interface Recommendation {
  id: string;
  category: 'performance' | 'accessibility' | 'seo' | 'bestPractices' | 'security';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  learnMore?: string;
}
