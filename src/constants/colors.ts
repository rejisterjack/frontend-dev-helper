/**
 * FrontendDevHelper - Colors, Breakpoints & UI Constants
 *
 * Color palettes, breakpoint definitions, z-index values,
 * animation timings, debounce delays, and error messages.
 */

// ============================================
// Color Map for Pesticide-like DOM Outlining
// ============================================

/**
 * Color map for DOM outliner (Pesticide-inspired)
 * Each level gets a distinct color for easy visual hierarchy
 */
export const COLOR_MAP = {
  // Level colors (depth-based)
  levels: [
    { bg: 'rgba(255, 0, 0, 0.15)', border: '#ff0000' }, // Level 0: Red
    { bg: 'rgba(0, 255, 0, 0.15)', border: '#00ff00' }, // Level 1: Green
    { bg: 'rgba(0, 0, 255, 0.15)', border: '#0000ff' }, // Level 2: Blue
    { bg: 'rgba(255, 255, 0, 0.15)', border: '#ffff00' }, // Level 3: Yellow
    { bg: 'rgba(255, 0, 255, 0.15)', border: '#ff00ff' }, // Level 4: Magenta
    { bg: 'rgba(0, 255, 255, 0.15)', border: '#00ffff' }, // Level 5: Cyan
    { bg: 'rgba(255, 128, 0, 0.15)', border: '#ff8000' }, // Level 6: Orange
    { bg: 'rgba(128, 0, 255, 0.15)', border: '#8000ff' }, // Level 7: Purple
    { bg: 'rgba(0, 255, 128, 0.15)', border: '#00ff80' }, // Level 8: Spring Green
    { bg: 'rgba(255, 0, 128, 0.15)', border: '#ff0080' }, // Level 9: Rose
  ],

  // Semantic colors
  semantic: {
    div: { bg: 'rgba(255, 0, 0, 0.1)', border: '#ff0000' },
    span: { bg: 'rgba(0, 255, 0, 0.1)', border: '#00ff00' },
    p: { bg: 'rgba(0, 0, 255, 0.1)', border: '#0000ff' },
    a: { bg: 'rgba(255, 255, 0, 0.1)', border: '#ffff00' },
    img: { bg: 'rgba(255, 0, 255, 0.2)', border: '#ff00ff' },
    button: { bg: 'rgba(0, 255, 255, 0.15)', border: '#00ffff' },
    input: { bg: 'rgba(255, 128, 0, 0.15)', border: '#ff8000' },
    form: { bg: 'rgba(128, 0, 255, 0.1)', border: '#8000ff' },
    header: { bg: 'rgba(255, 100, 100, 0.1)', border: '#ff6464' },
    footer: { bg: 'rgba(100, 255, 100, 0.1)', border: '#64ff64' },
    nav: { bg: 'rgba(100, 100, 255, 0.1)', border: '#6464ff' },
    section: { bg: 'rgba(255, 200, 0, 0.1)', border: '#ffc800' },
    article: { bg: 'rgba(255, 100, 200, 0.1)', border: '#ff64c8' },
    aside: { bg: 'rgba(100, 255, 200, 0.1)', border: '#64ffc8' },
    main: { bg: 'rgba(200, 100, 255, 0.1)', border: '#c864ff' },
  },

  // Spacing visualizer colors
  spacing: {
    margin: 'rgba(255, 165, 0, 0.3)', // Orange
    padding: 'rgba(0, 128, 0, 0.3)', // Green
    gap: 'rgba(0, 0, 255, 0.3)', // Blue
    border: 'rgba(255, 0, 0, 0.5)', // Red
  },
} as const;

// ============================================
// Breakpoints
// ============================================

/**
 * Tailwind CSS breakpoints
 */
export const TAILWIND_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Bootstrap breakpoints
 */
export const BOOTSTRAP_BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
} as const;

/**
 * Material Design breakpoints
 */
export const MATERIAL_BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Common device breakpoints
 */
export const DEVICE_BREAKPOINTS = {
  mobile: { min: 0, max: 767, name: 'Mobile' },
  tablet: { min: 768, max: 1023, name: 'Tablet' },
  desktop: { min: 1024, max: 1439, name: 'Desktop' },
  wide: { min: 1440, max: Infinity, name: 'Wide Desktop' },
} as const;

/**
 * Combined breakpoints for responsive design
 */
export const BREAKPOINTS = {
  tailwind: TAILWIND_BREAKPOINTS,
  bootstrap: BOOTSTRAP_BREAKPOINTS,
  material: MATERIAL_BREAKPOINTS,
  devices: DEVICE_BREAKPOINTS,
} as const;

/**
 * Get all breakpoint values as an array for overlay display
 */
export const ALL_BREAKPOINTS = [
  { name: 'xs', width: 0, label: 'Extra Small' },
  { name: 'sm', width: 640, label: 'Small (Tailwind)' },
  { name: 'sm-bs', width: 576, label: 'Small (Bootstrap)' },
  { name: 'md', width: 768, label: 'Medium' },
  { name: 'lg', width: 992, label: 'Large (Bootstrap)' },
  { name: 'lg-tw', width: 1024, label: 'Large (Tailwind)' },
  { name: 'xl', width: 1200, label: 'Extra Large (Bootstrap)' },
  { name: 'xl-tw', width: 1280, label: 'Extra Large (Tailwind)' },
  { name: 'xxl', width: 1400, label: '2XL (Bootstrap)' },
  { name: '2xl', width: 1536, label: '2XL (Tailwind)' },
];

// ============================================
// UI Constants
// ============================================

/**
 * Z-index values for extension overlays
 */
export const Z_INDEX = {
  base: 2147483600,
  tooltip: 2147483601,
  overlay: 2147483602,
  modal: 2147483603,
  notification: 2147483604,
} as const;

/**
 * Animation durations
 */
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Debounce delays
 */
export const DEBOUNCE = {
  fast: 50,
  normal: 150,
  slow: 300,
  resize: 100,
  scroll: 16, // ~60fps
} as const;

// ============================================
// Error Messages
// ============================================

/**
 * Standard error messages
 */
export const ERROR_MESSAGES = {
  STORAGE_GET_FAILED: 'Failed to retrieve data from storage',
  STORAGE_SET_FAILED: 'Failed to save data to storage',
  STORAGE_CLEAR_FAILED: 'Failed to clear storage',
  TAB_NOT_FOUND: 'Tab not found',
  MESSAGE_SEND_FAILED: 'Failed to send message',
  TOOL_NOT_FOUND: 'Tool not found',
  INVALID_STATE: 'Invalid tool state',
} as const;
