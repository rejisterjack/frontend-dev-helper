/**
 * Network Analyzer - Constants
 *
 * Constants and configuration for the Network Analyzer module.
 */

import type { FilterConfig, ResourcePattern } from './types';

// Resource type detection patterns
export const RESOURCE_PATTERNS: ResourcePattern[] = [
  {
    type: 'stylesheet',
    patterns: [/\.css$/i, /\.scss$/i, /\.sass$/i, /\.less$/i, /text\/css/i],
  },
  {
    type: 'script',
    patterns: [
      /\.js$/i,
      /\.ts$/i,
      /\.jsx$/i,
      /\.tsx$/i,
      /text\/javascript/i,
      /application\/javascript/i,
    ],
  },
  {
    type: 'image',
    patterns: [/\.(png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|tiff?)$/i, /image\//i],
  },
  {
    type: 'font',
    patterns: [/\.(woff2?|ttf|otf|eot)$/i, /font\//i, /application\/font/i],
  },
  {
    type: 'media',
    patterns: [/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i, /video\//i, /audio\//i],
  },
  {
    type: 'api',
    patterns: [/\/api\//i, /graphql/i, /rest\//i, /json$/i, /application\/json/i],
  },
];

// Filter button configurations
export const FILTER_CONFIGS: FilterConfig[] = [
  { type: 'all', label: 'All', color: '#64748b' },
  { type: 'document', label: 'Doc', color: '#f59e0b' },
  { type: 'stylesheet', label: 'CSS', color: '#3b82f6' },
  { type: 'script', label: 'JS', color: '#facc15' },
  { type: 'image', label: 'Img', color: '#22c55e' },
  { type: 'font', label: 'Font', color: '#a855f7' },
  { type: 'api', label: 'API', color: '#ec4899' },
  { type: 'media', label: 'Media', color: '#06b6d4' },
];

// Type colors for UI
export const TYPE_COLORS: Record<string, string> = {
  document: '#f59e0b',
  stylesheet: '#3b82f6',
  script: '#facc15',
  image: '#22c55e',
  font: '#a855f7',
  api: '#ec4899',
  media: '#06b6d4',
  other: '#94a3b8',
};

// Type icons for UI
export const TYPE_ICONS: Record<string, string> = {
  document: 'D',
  stylesheet: 'C',
  script: 'J',
  image: 'I',
  font: 'F',
  api: 'A',
  media: 'M',
  other: '?',
};
