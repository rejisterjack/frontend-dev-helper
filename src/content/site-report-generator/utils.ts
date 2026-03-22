/**
 * Site Report Generator Utilities
 */

import type { MetricScore } from './types';

export function createMetricScore(
  value: number | null,
  unit: string,
  thresholds: { good: number; poor: number },
  lowerIsBetter = false
): MetricScore {
  let score = 100;
  let rating: MetricScore['rating'] = 'good';

  if (value === null) {
    score = 0;
    rating = 'poor';
  } else if (lowerIsBetter) {
    if (value <= thresholds.good) {
      score = 90 + (10 * (thresholds.good - value)) / thresholds.good;
      rating = 'good';
    } else if (value <= thresholds.poor) {
      score = 50 + (40 * (thresholds.poor - value)) / (thresholds.poor - thresholds.good);
      rating = 'needs-improvement';
    } else {
      score = Math.max(0, 50 - (10 * value) / thresholds.poor);
      rating = 'poor';
    }
  } else {
    if (value >= thresholds.good) {
      score = 90 + Math.min(10, (10 * value) / thresholds.good);
      rating = 'good';
    } else if (value >= thresholds.poor) {
      score = 50 + (40 * (value - thresholds.poor)) / (thresholds.good - thresholds.poor);
      rating = 'needs-improvement';
    } else {
      score = Math.max(0, (50 * value) / thresholds.poor);
      rating = 'poor';
    }
  }

  return { value, unit, score: Math.round(score), rating };
}

export function colorToHex(color: string): string | null {
  const div = document.createElement('div');
  div.style.color = color;
  div.style.display = 'none';
  document.body.appendChild(div);
  const computed = getComputedStyle(div).color;
  document.body.removeChild(div);

  const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return rgbToHex(r, g, b);
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 70) return '#eab308';
  return '#ef4444';
}

export { escapeHtml } from '@/utils/sanitize';
