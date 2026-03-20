import { logger } from '../utils/logger';

/**
 * Tech Stack Detector
 *
 * Detects the technologies used on a website including:
 * - Frameworks (React, Vue, Angular, Svelte, etc.)
 * - CSS libraries (Tailwind, Bootstrap, etc.)
 * - Analytics tools
 * - Fonts and icon libraries
 * - Build tools and more
 */

interface DetectedTech {
  name: string;
  category: 'framework' | 'css' | 'analytics' | 'font' | 'build' | 'cms' | 'other';
  version?: string;
  icon?: string;
  confidence: 'high' | 'medium' | 'low';
}

// Note: TechStackResult interface can be added here if needed for external API responses

// Tech detection patterns
const TECH_PATTERNS: Record<
  string,
  { category: DetectedTech['category']; patterns: (() => boolean)[]; icon: string }
> = {
  React: {
    category: 'framework',
    icon: '⚛️',
    patterns: [
      () => !!window.React,
      () => !!document.querySelector('[data-reactroot], [data-reactid]'),
      () => !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      () => document.querySelectorAll('*[class*="_react"]').length > 0,
    ],
  },
  'Vue.js': {
    category: 'framework',
    icon: '💚',
    patterns: [
      () => !!window.Vue,
      () => !!document.querySelector('#app[data-v-app]'),
      () => !!window.__VUE__ || !!window.__VUE_OPTIONS_API__,
      () => document.querySelectorAll('[v-cloak], [v-if], [v-for]').length > 0,
    ],
  },
  Angular: {
    category: 'framework',
    icon: '🅰️',
    patterns: [
      () => !!window.angular,
      () => !!document.querySelector('[ng-app], [ng-controller], [ng-model]'),
      () => document.querySelectorAll('*[ng-version]').length > 0,
    ],
  },
  Svelte: {
    category: 'framework',
    icon: '🔥',
    patterns: [
      () => !!window.__svelte__,
      () => document.querySelectorAll('[class*="svelte"]').length > 0,
    ],
  },
  'Next.js': {
    category: 'framework',
    icon: '▲',
    patterns: [
      () => !!window.__NEXT_DATA__,
      () => document.querySelector('script#__NEXT_DATA__') !== null,
    ],
  },
  Nuxt: {
    category: 'framework',
    icon: '⛰️',
    patterns: [() => !!window.__NUXT__, () => !!window.$nuxt],
  },
  'Tailwind CSS': {
    category: 'css',
    icon: '🌊',
    patterns: [
      () =>
        document.querySelectorAll('[class*="flex"], [class*="grid"], [class*="p-"], [class*="m-"]')
          .length > 20,
      () => !!document.querySelector('style[data-tailwind]'),
      () =>
        document.querySelectorAll('*[class*="sm:"], *[class*="md:"], *[class*="lg:"]').length > 10,
    ],
  },
  Bootstrap: {
    category: 'css',
    icon: '🅱️',
    patterns: [
      () => !!window.bootstrap,
      () => document.querySelectorAll('.container, .row, .col-md-').length > 5,
      () => !!document.querySelector('link[href*="bootstrap"]'),
    ],
  },
  'Material UI': {
    category: 'css',
    icon: '🎨',
    patterns: [() => document.querySelectorAll('[class*="Mui"]').length > 5, () => !!window.Mui],
  },
  'Styled Components': {
    category: 'css',
    icon: '💅',
    patterns: [
      () => document.querySelectorAll('style[data-styled]').length > 0,
      () => document.querySelectorAll('*[class*="sc-"]').length > 5,
    ],
  },
  jQuery: {
    category: 'framework',
    icon: '$',
    patterns: [() => !!window.jQuery, () => !!window.$],
  },
  'Google Analytics': {
    category: 'analytics',
    icon: '📊',
    patterns: [() => !!window.ga, () => !!window.gtag, () => !!window.GoogleAnalyticsObject],
  },
  'Google Tag Manager': {
    category: 'analytics',
    icon: '🏷️',
    patterns: [() => !!window.google_tag_manager, () => !!window.dataLayer],
  },
  Segment: {
    category: 'analytics',
    icon: '📈',
    patterns: [() => !!window.analytics, () => !!window.segment],
  },
  Mixpanel: {
    category: 'analytics',
    icon: '📉',
    patterns: [() => !!window.mixpanel],
  },
  Hotjar: {
    category: 'analytics',
    icon: '🔥',
    patterns: [() => !!window.hj],
  },
  WordPress: {
    category: 'cms',
    icon: '📝',
    patterns: [
      () => !!window.wp,
      () => !!document.querySelector('meta[name="generator"][content*="WordPress"]'),
      () => document.querySelectorAll('link[href*="wp-content"]').length > 0,
    ],
  },
  Shopify: {
    category: 'cms',
    icon: '🛒',
    patterns: [
      () => !!window.Shopify,
      () => document.querySelectorAll('script[src*="shopify"]').length > 0,
    ],
  },
  Webflow: {
    category: 'cms',
    icon: '💙',
    patterns: [() => !!window.Webflow, () => !!document.querySelector('html[data-wf-site]')],
  },
  Vite: {
    category: 'build',
    icon: '⚡',
    patterns: [
      () => !!window.__vite_plugin_react_preamble_installed__,
      () => document.querySelectorAll('script[type="module"]').length > 5,
    ],
  },
  Webpack: {
    category: 'build',
    icon: '📦',
    patterns: [() => !!window.webpackJsonp, () => !!window.__webpack_require__],
  },
  'Google Fonts': {
    category: 'font',
    icon: '🔤',
    patterns: [() => document.querySelectorAll('link[href*="fonts.googleapis.com"]').length > 0],
  },
  'Font Awesome': {
    category: 'font',
    icon: '⭐',
    patterns: [
      () => !!window.FontAwesome,
      () =>
        document.querySelectorAll('link[href*="font-awesome"], link[href*="fontawesome"]').length >
        0,
      () => document.querySelectorAll('.fa, .fas, .far, .fab').length > 5,
    ],
  },
  TypeScript: {
    category: 'other',
    icon: '📘',
    patterns: [() => !!window.__typescript__],
  },
  Emotion: {
    category: 'css',
    icon: '🎭',
    patterns: [() => document.querySelectorAll('style[data-emotion]').length > 0],
  },
  Lodash: {
    category: 'other',
    icon: '🔗',
    patterns: [() => !!window._ && !!window._.debounce],
  },
  Axios: {
    category: 'other',
    icon: '🌐',
    patterns: [() => !!window.axios],
  },
};

// State
let isActive = false;
let panel: HTMLElement | null = null;
let detectedTech: DetectedTech[] = [];

/**
 * Detect all technologies
 */
function detectTechnologies(): DetectedTech[] {
  const detected: DetectedTech[] = [];

  for (const [name, data] of Object.entries(TECH_PATTERNS)) {
    let confidence: DetectedTech['confidence'] = 'low';
    let matched = false;

    for (const pattern of data.patterns) {
      try {
        if (pattern()) {
          matched = true;
          confidence = 'high';
          break;
        }
      } catch {
        // Pattern failed, continue
      }
    }

    if (matched) {
      detected.push({
        name,
        category: data.category,
        icon: data.icon,
        confidence,
      });
    }
  }

  // Additional detection based on HTML/Script analysis
  detectFromScripts(detected);
  detectFromMeta(detected);

  return detected.sort((a, b) => {
    // Sort by category then name
    const catOrder = { framework: 0, css: 1, cms: 2, analytics: 3, build: 4, font: 5, other: 6 };
    return catOrder[a.category] - catOrder[b.category] || a.name.localeCompare(b.name);
  });
}

/**
 * Detect from script tags
 */
function detectFromScripts(detected: DetectedTech[]): void {
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const srcs = scripts.map((s) => (s as HTMLScriptElement).src.toLowerCase());

  // Check for React from scripts
  if (srcs.some((s) => s.includes('react')) && !detected.find((t) => t.name === 'React')) {
    detected.push({ name: 'React', category: 'framework', confidence: 'medium', icon: '⚛️' });
  }

  // Check for Vue
  if (srcs.some((s) => s.includes('vue')) && !detected.find((t) => t.name === 'Vue.js')) {
    detected.push({ name: 'Vue.js', category: 'framework', confidence: 'medium', icon: '💚' });
  }

  // Check for analytics
  if (srcs.some((s) => s.includes('google-analytics') || s.includes('googletagmanager'))) {
    if (!detected.find((t) => t.name === 'Google Analytics')) {
      detected.push({
        name: 'Google Analytics',
        category: 'analytics',
        confidence: 'medium',
        icon: '📊',
      });
    }
  }
}

/**
 * Detect from meta tags
 */
function detectFromMeta(detected: DetectedTech[]): void {
  const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content');

  if (generator) {
    if (generator.includes('WordPress') && !detected.find((t) => t.name === 'WordPress')) {
      detected.push({ name: 'WordPress', category: 'cms', confidence: 'high', icon: '📝' });
    }
    if (generator.includes('Gatsby') && !detected.find((t) => t.name === 'Gatsby')) {
      detected.push({ name: 'Gatsby', category: 'framework', confidence: 'high', icon: '⚡' });
    }
  }
}

/**
 * Create detection panel
 */
function createPanel(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'fdh-tech-panel';
  el.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 2147483647;
    background: rgba(15, 23, 42, 0.98);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 20px;
    min-width: 280px;
    max-width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: 'JetBrains Mono', 'Fira Code', system-ui, sans-serif;
    font-size: 13px;
    color: #e2e8f0;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
  `;

  document.body.appendChild(el);
  return el;
}

/**
 * Build panel content
 */
function buildPanelContent(): string {
  detectedTech = detectTechnologies();

  // Group by category
  const byCategory = new Map<DetectedTech['category'], DetectedTech[]>();
  detectedTech.forEach((tech) => {
    if (!byCategory.has(tech.category)) {
      byCategory.set(tech.category, []);
    }
    byCategory.get(tech.category)!.push(tech);
  });

  const categoryLabels: Record<DetectedTech['category'], string> = {
    framework: '🚀 Frameworks',
    css: '🎨 CSS Libraries',
    analytics: '📊 Analytics',
    font: '🔤 Fonts & Icons',
    build: '📦 Build Tools',
    cms: '📝 CMS',
    other: '🔧 Other',
  };

  const categoryOrder: DetectedTech['category'][] = [
    'framework',
    'css',
    'cms',
    'analytics',
    'build',
    'font',
    'other',
  ];

  return `
    <div class="fdh-tech-header" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 16px; color: #c084fc;">🔍 Tech Stack</h3>
        <button class="fdh-close-btn" style="
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        ">×</button>
      </div>
      <div style="font-size: 11px; color: #64748b;">
        ${detectedTech.length} technologies detected on ${new URL(window.location.href).hostname}
      </div>
    </div>
    
    <div class="fdh-tech-list" style="display: flex; flex-direction: column; gap: 16px;">
      ${
        detectedTech.length === 0
          ? '<div style="text-align: center; padding: 20px; color: #64748b;">No technologies detected</div>'
          : categoryOrder
              .map((category) => {
                const techs = byCategory.get(category);
                if (!techs || techs.length === 0) return '';

                return `
              <div class="fdh-tech-category">
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-weight: 600;">
                  ${categoryLabels[category]}
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${techs
                    .map(
                      (tech) => `
                    <div class="fdh-tech-item" style="
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      padding: 8px 12px;
                      background: rgba(30, 41, 59, 0.6);
                      border-radius: 8px;
                      transition: background 0.2s;
                    ">
                      <span style="font-size: 18px;">${tech.icon}</span>
                      <span style="flex: 1; font-weight: 500;">${tech.name}</span>
                      <span style="
                        font-size: 10px;
                        padding: 2px 8px;
                        border-radius: 10px;
                        background: ${tech.confidence === 'high' ? 'rgba(34, 197, 94, 0.2)' : tech.confidence === 'medium' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(100, 116, 139, 0.2)'};
                        color: ${tech.confidence === 'high' ? '#4ade80' : tech.confidence === 'medium' ? '#facc15' : '#94a3b8'};
                      ">${tech.confidence}</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            `;
              })
              .join('')
      }
    </div>
    
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px;">
      <button class="fdh-refresh-btn" style="
        flex: 1;
        background: rgba(99, 102, 241, 0.2);
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #818cf8;
        font-size: 11px;
        cursor: pointer;
      ">🔄 Refresh</button>
      <button class="fdh-copy-btn" style="
        flex: 1;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 6px;
        padding: 8px;
        color: #4ade80;
        font-size: 11px;
        cursor: pointer;
      ">📋 Copy</button>
    </div>
    
    <div style="margin-top: 12px; text-align: center; font-size: 11px; color: #64748b;">
      Press <kbd style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
    </div>
  `;
}

/**
 * Setup panel controls
 */
function setupPanelControls(): void {
  if (!panel) return;

  // Close button
  const closeBtn = panel.querySelector('.fdh-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', disable);
  }

  // Refresh button
  const refreshBtn = panel.querySelector('.fdh-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      panel!.innerHTML = buildPanelContent();
      setupPanelControls();
    });
  }

  // Copy button
  const copyBtn = panel.querySelector('.fdh-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const report = {
        url: window.location.href,
        detectedAt: new Date().toISOString(),
        technologies: detectedTech.map((t) => ({
          name: t.name,
          category: t.category,
          confidence: t.confidence,
        })),
      };

      navigator.clipboard.writeText(JSON.stringify(report, null, 2)).then(() => {
        const btn = copyBtn as HTMLButtonElement;
        btn.textContent = '✓ Copied!';
        setTimeout(() => (btn.textContent = '📋 Copy'), 1500);
      });
    });
  }
}

/**
 * Handle key down
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    disable();
  }
}

/**
 * Enable Tech Detector
 */
export function enable(): void {
  if (isActive) return;
  isActive = true;

  if (!panel) {
    panel = createPanel();
  }

  panel.innerHTML = buildPanelContent();
  setupPanelControls();

  document.addEventListener('keydown', handleKeyDown);

  logger.log('[TechDetector] Enabled');
}

/**
 * Disable Tech Detector
 */
export function disable(): void {
  if (!isActive) return;
  isActive = false;

  document.removeEventListener('keydown', handleKeyDown);

  if (panel) {
    panel.remove();
    panel = null;
  }

  logger.log('[TechDetector] Disabled');
}

/**
 * Toggle Tech Detector
 */
export function toggle(): void {
  if (isActive) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): { enabled: boolean; techCount: number } {
  return {
    enabled: isActive,
    techCount: detectedTech.length,
  };
}

/**
 * Get detected technologies
 */
export function getDetectedTech(): DetectedTech[] {
  return [...detectedTech];
}

/**
 * Cleanup
 */
export function destroy(): void {
  disable();
}

// Export singleton API
export const techDetector = {
  enable,
  disable,
  toggle,
  getState,
  getDetectedTech,
  destroy,
};

export default techDetector;
