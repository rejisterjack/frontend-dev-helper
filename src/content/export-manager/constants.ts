/**
 * Export Manager Constants
 *
 * Constants and configuration for the export manager module
 */

/** Relevant CSS properties for style extraction */
export const RELEVANT_STYLE_PROPERTIES = [
  'color',
  'backgroundColor',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'lineHeight',
  'textAlign',
  'display',
  'position',
  'margin',
  'padding',
  'border',
  'borderRadius',
  'width',
  'height',
] as const;

/** Tag to implicit ARIA role mapping */
export const TAG_IMPLICIT_ROLES: Record<string, string> = {
  a: 'link',
  button: 'button',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  img: 'img',
  input: 'textbox',
  nav: 'navigation',
  main: 'main',
  article: 'article',
  aside: 'complementary',
  footer: 'contentinfo',
  header: 'banner',
};

/** Framework detection globals */
export const FRAMEWORK_GLOBALS = [
  { name: 'React', global: 'React', detected: 'react' },
  { name: 'Vue', global: 'Vue', detected: 'vue' },
  { name: 'Angular', global: 'angular', detected: 'angular' },
  { name: 'Vue 3', global: '__VUE__', detected: 'vue3' },
  { name: 'Next.js', global: 'Next', detected: 'nextjs' },
  { name: 'Svelte', global: 'Svelte', detected: 'svelte' },
  { name: 'jQuery', global: 'jQuery', detected: 'jquery' },
  { name: 'Bootstrap', global: 'bootstrap', detected: 'bootstrap' },
  { name: 'Tailwind CSS', global: 'tailwind', detected: 'tailwind' },
] as const;

/** Default PDF options */
export const DEFAULT_PDF_OPTIONS = {
  title: 'Frontend Dev Helper Report',
  includeHeader: true,
  includeFooter: true,
  theme: 'light' as const,
  pageSize: 'a4' as const,
};

/** Default screenshot options */
export const DEFAULT_SCREENSHOT_OPTIONS = {
  format: 'png' as const,
  quality: 0.9,
};

/** Default export scope */
export const DEFAULT_EXPORT_SCOPE = {
  elements: true,
  styles: true,
  performance: true,
  memory: true,
  pageInfo: true,
};

/** Extension version */
export const EXTENSION_VERSION = '1.0.0';

/** Default filename base */
export const DEFAULT_FILENAME_BASE = 'frontend-dev-helper-export';
