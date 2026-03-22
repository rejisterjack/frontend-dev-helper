/**
 * Design System Presets
 * Pre-configured design system tokens for popular frameworks
 */

import type { DesignSystemTokens } from './types';

export const PRESETS: Record<string, DesignSystemTokens> = {
  material: {
    name: 'Material Design 3',
    spacing: {
      scale: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96],
      unit: 'px',
      tolerance: 1,
    },
    colors: {
      primary: ['#6750A4', '#7F67BE', '#9A82DB', '#B69DF8'],
      secondary: ['#625B71', '#7A7289', '#958DA5', '#B0A7C0'],
      neutral: [
        '#1C1B1F',
        '#313033',
        '#484649',
        '#605D62',
        '#787579',
        '#939094',
        '#AEAAAE',
        '#CAC4D0',
        '#E7E0EC',
        '#F5EFF7',
      ],
      semantic: {
        success: ['#4CAF50', '#81C784', '#A5D6A7'],
        warning: ['#FF9800', '#FFB74D', '#FFCC80'],
        error: ['#F44336', '#E57373', '#EF9A9A'],
        info: ['#2196F3', '#64B5F6', '#90CAF9'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 45, 57, 64],
      fontWeights: [400, 500, 600, 700],
      lineHeights: [1.2, 1.25, 1.33, 1.4, 1.5, 1.6],
      fontFamilies: ['Roboto', 'sans-serif'],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 4, 8, 12, 16, 20, 24, 28, 32],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0px 1px 3px rgba(0,0,0,0.12), 0px 1px 1px rgba(0,0,0,0.14)',
        '0px 1px 5px rgba(0,0,0,0.12), 0px 2px 2px rgba(0,0,0,0.14)',
        '0px 1px 8px rgba(0,0,0,0.12), 0px 3px 4px rgba(0,0,0,0.14)',
        '0px 2px 4px rgba(0,0,0,0.12), 0px 4px 5px rgba(0,0,0,0.14)',
        '0px 3px 5px rgba(0,0,0,0.12), 0px 6px 10px rgba(0,0,0,0.14)',
        '0px 5px 5px rgba(0,0,0,0.12), 0px 8px 10px rgba(0,0,0,0.14)',
        '0px 5px 8px rgba(0,0,0,0.12), 0px 9px 12px rgba(0,0,0,0.14)',
        '0px 6px 10px rgba(0,0,0,0.12), 0px 12px 17px rgba(0,0,0,0.14)',
      ],
    },
  },
  tailwind: {
    name: 'Tailwind CSS',
    spacing: {
      scale: [0, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 56, 64, 72, 80, 96],
      unit: 'px',
      tolerance: 0,
    },
    colors: {
      primary: ['#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
      secondary: ['#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6'],
      neutral: [
        '#0F172A',
        '#1E293B',
        '#334155',
        '#475569',
        '#64748B',
        '#94A3B8',
        '#CBD5E1',
        '#E2E8F0',
        '#F1F5F9',
        '#F8FAFC',
      ],
      semantic: {
        success: ['#22C55E', '#16A34A', '#15803D'],
        warning: ['#F59E0B', '#D97706', '#B45309'],
        error: ['#EF4444', '#DC2626', '#B91C1C'],
        info: ['#06B6D4', '#0891B2', '#0E7490'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128],
      fontWeights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
      lineHeights: [1, 1.25, 1.375, 1.5, 1.625, 2],
      fontFamilies: [
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 2, 4, 6, 8, 12, 16, 24, 9999],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0 1px 2px 0 rgba(0,0,0,0.05)',
        '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '0 25px 50px -12px rgba(0,0,0,0.25)',
        'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      ],
    },
  },
  bootstrap: {
    name: 'Bootstrap 5',
    spacing: {
      scale: [0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64],
      unit: 'px',
      tolerance: 0,
    },
    colors: {
      primary: ['#0D6EFD', '#0B5ED7', '#0A58CA', '#094DB1'],
      secondary: ['#6C757D', '#5C636A', '#565E64', '#4C5258'],
      neutral: [
        '#212529',
        '#343A40',
        '#495057',
        '#6C757D',
        '#ADB5BD',
        '#DEE2E6',
        '#E9ECEF',
        '#F8F9FA',
      ],
      semantic: {
        success: ['#198754', '#157347', '#146C43'],
        warning: ['#FFC107', '#FFCA2C', '#FFCD39'],
        error: ['#DC3545', '#BB2D3B', '#B02A37'],
        info: ['#0DCAF0', '#31D2F2', '#3DD5F3'],
      },
    },
    typography: {
      fontSizes: [12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64],
      fontWeights: [300, 400, 500, 600, 700, 800, 900],
      lineHeights: [1, 1.2, 1.25, 1.4, 1.5, 1.6, 1.75],
      fontFamilies: [
        'system-ui',
        '-apple-system',
        'Segoe UI',
        'Roboto',
        'Helvetica Neue',
        'Arial',
        'sans-serif',
      ],
      unit: 'px',
    },
    borderRadius: {
      values: [0, 2, 4, 6, 8, 16, 160, 290],
      unit: 'px',
    },
    shadows: {
      values: [
        'none',
        '0 0.125rem 0.25rem rgba(0,0,0,0.075)',
        '0 0.5rem 1rem rgba(0,0,0,0.15)',
        '0 1rem 3rem rgba(0,0,0,0.175)',
        'inset 0 1px 2px rgba(0,0,0,0.075)',
      ],
    },
  },
};
