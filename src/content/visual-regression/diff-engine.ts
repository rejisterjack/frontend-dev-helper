/**
 * Diff Engine Module
 *
 * Pixel-perfect image comparison engine that:
 * - Compares images pixel by pixel
 * - Calculates percentage difference
 * - Generates diff visualization with color overlay
 * - Supports threshold configuration
 * - Supports ignore regions
 */

import type { DiffResult } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Types
// ============================================

export interface DiffOptions {
  /** Threshold percentage (0-100), default 0.1% */
  threshold?: number;
  /** Regions to ignore during comparison */
  ignoreRegions?: Array<{ x: number; y: number; width: number; height: number }>;
  /** Highlight color for differences [r, g, b, a] */
  highlightColor?: [number, number, number, number];
  /** Whether to generate diff image */
  generateDiffImage?: boolean;
  /** Antialiasing detection (ignore 1px shifts) */
  ignoreAntialiasing?: boolean;
  /** Pixel offset tolerance for antialiasing */
  tolerance?: number;
}

export interface PixelComparison {
  totalPixels: number;
  differentPixels: number;
  diffPercentage: number;
  match: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_THRESHOLD = 0.1;
const DEFAULT_HIGHLIGHT_COLOR: [number, number, number, number] = [255, 0, 0, 255]; // Red
const DEFAULT_TOLERANCE = 0;

// ============================================
// Image Loading
// ============================================

/**
 * Load an image from a data URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Load image data from a data URL
 */
async function loadImageData(src: string): Promise<{
  data: ImageData;
  width: number;
  height: number;
}> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  return {
    data: imageData,
    width: img.width,
    height: img.height,
  };
}

// ============================================
// Pixel Comparison
// ============================================

/**
 * Check if a point is within an ignore region
 */
function isInIgnoreRegion(
  x: number,
  y: number,
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }>
): boolean {
  return ignoreRegions.some(
    (region) =>
      x >= region.x && x < region.x + region.width && y >= region.y && y < region.y + region.height
  );
}

/**
 * Get pixel color at coordinates
 */
function getPixel(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): {
  r: number;
  g: number;
  b: number;
  a: number;
} {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

/**
 * Check if two pixels are similar within tolerance
 */
function pixelsAreSimilar(
  p1: { r: number; g: number; b: number; a: number },
  p2: { r: number; g: number; b: number; a: number },
  tolerance: number
): boolean {
  return (
    Math.abs(p1.r - p2.r) <= tolerance &&
    Math.abs(p1.g - p2.g) <= tolerance &&
    Math.abs(p1.b - p2.b) <= tolerance &&
    Math.abs(p1.a - p2.a) <= tolerance
  );
}

/**
 * Compare two images pixel by pixel
 */
function comparePixels(
  baselineData: ImageData,
  currentData: ImageData,
  options: DiffOptions
): {
  comparison: PixelComparison;
  diffData: ImageData;
} {
  const width = Math.max(baselineData.width, currentData.width);
  const height = Math.max(baselineData.height, currentData.height);

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) {
    throw new Error('Failed to get diff canvas context');
  }

  // Fill with white background
  diffCtx.fillStyle = '#ffffff';
  diffCtx.fillRect(0, 0, width, height);

  const diffImageData = diffCtx.getImageData(0, 0, width, height);
  const diffPixels = diffImageData.data;

  const highlightColor = options.highlightColor || DEFAULT_HIGHLIGHT_COLOR;
  const ignoreRegions = options.ignoreRegions || [];
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;

  let differentPixels = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;

      // Check if this pixel is in an ignore region
      if (isInIgnoreRegion(x, y, ignoreRegions)) {
        // Copy from baseline or use gray for ignored regions
        if (x < baselineData.width && y < baselineData.height) {
          const pixel = getPixel(baselineData.data, x, y, baselineData.width);
          diffPixels[index] = pixel.r;
          diffPixels[index + 1] = pixel.g;
          diffPixels[index + 2] = pixel.b;
          diffPixels[index + 3] = 128; // Semi-transparent for ignored
        } else {
          diffPixels[index] = 200;
          diffPixels[index + 1] = 200;
          diffPixels[index + 2] = 200;
          diffPixels[index + 3] = 128;
        }
        continue;
      }

      let isDifferent = false;

      if (
        x < baselineData.width &&
        x < currentData.width &&
        y < baselineData.height &&
        y < currentData.height
      ) {
        // Both images have this pixel
        const p1 = getPixel(baselineData.data, x, y, baselineData.width);
        const p2 = getPixel(currentData.data, x, y, currentData.width);

        if (!pixelsAreSimilar(p1, p2, tolerance)) {
          isDifferent = true;
        }
      } else {
        // Size mismatch - mark as different
        isDifferent = true;
      }

      if (isDifferent) {
        differentPixels++;
        // Highlight difference
        diffPixels[index] = highlightColor[0];
        diffPixels[index + 1] = highlightColor[1];
        diffPixels[index + 2] = highlightColor[2];
        diffPixels[index + 3] = highlightColor[3];
      } else {
        // Copy from baseline (or use white for matching)
        if (x < baselineData.width && y < baselineData.height) {
          const pixel = getPixel(baselineData.data, x, y, baselineData.width);
          // Dim the matching pixels slightly for better contrast
          diffPixels[index] = Math.min(255, pixel.r + 50);
          diffPixels[index + 1] = Math.min(255, pixel.g + 50);
          diffPixels[index + 2] = Math.min(255, pixel.b + 50);
          diffPixels[index + 3] = pixel.a;
        } else {
          diffPixels[index] = 255;
          diffPixels[index + 1] = 255;
          diffPixels[index + 2] = 255;
          diffPixels[index + 3] = 255;
        }
      }
    }
  }

  const diffPercentage = (differentPixels / totalPixels) * 100;

  return {
    comparison: {
      totalPixels,
      differentPixels,
      diffPercentage,
      match: diffPercentage <= (options.threshold ?? DEFAULT_THRESHOLD),
    },
    diffData: diffImageData,
  };
}

// ============================================
// Public API
// ============================================

/**
 * Compare two screenshots and generate a diff result
 */
export async function compareScreenshots(
  baselineImage: string,
  currentImage: string,
  options: DiffOptions = {}
): Promise<DiffResult> {
  const startTime = performance.now();

  try {
    // Load both images
    const [baseline, current] = await Promise.all([
      loadImageData(baselineImage),
      loadImageData(currentImage),
    ]);

    // Compare pixels
    const { comparison, diffData } = comparePixels(baseline.data, current.data, options);

    // Generate diff image if requested
    let diffImage: string | undefined;
    if (options.generateDiffImage !== false) {
      const diffCanvas = document.createElement('canvas');
      diffCanvas.width = diffData.width;
      diffCanvas.height = diffData.height;
      const diffCtx = diffCanvas.getContext('2d');
      if (diffCtx) {
        diffCtx.putImageData(diffData, 0, 0);
        diffImage = diffCanvas.toDataURL('image/png');
      }
    }

    const result: DiffResult = {
      match: comparison.match,
      diffPercentage: comparison.diffPercentage,
      pixelsDifferent: comparison.differentPixels,
      totalPixels: comparison.totalPixels,
      diffImage,
      threshold: options.threshold ?? DEFAULT_THRESHOLD,
    };

    const duration = Math.round(performance.now() - startTime);
    logger.log(
      `[DiffEngine] Comparison complete in ${duration}ms:`,
      `${comparison.diffPercentage.toFixed(4)}% diff,`,
      comparison.match ? 'MATCH' : 'MISMATCH'
    );

    return result;
  } catch (error) {
    logger.error('[DiffEngine] Comparison failed:', error);
    throw error;
  }
}

/**
 * Quick compare - returns true if images match within threshold
 */
export async function quickCompare(
  baselineImage: string,
  currentImage: string,
  threshold: number = DEFAULT_THRESHOLD
): Promise<boolean> {
  const result = await compareScreenshots(baselineImage, currentImage, {
    threshold,
    generateDiffImage: false,
  });
  return result.match;
}

/**
 * Generate side-by-side comparison image
 */
export async function generateComparisonImage(
  baselineImage: string,
  currentImage: string,
  diffImage?: string
): Promise<string> {
  const [baseline, current] = await Promise.all([
    loadImageData(baselineImage),
    loadImageData(currentImage),
  ]);

  // Calculate canvas dimensions
  const maxWidth = Math.max(baseline.width, current.width);
  const maxHeight = Math.max(baseline.height, current.height);
  const cols = diffImage ? 3 : 2;

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth * cols;
  canvas.height = maxHeight + 40; // Extra space for labels

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Fill background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw labels
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Baseline', maxWidth / 2, 25);
  ctx.fillText('Current', maxWidth + maxWidth / 2, 25);
  if (diffImage) {
    ctx.fillText('Diff', maxWidth * 2 + maxWidth / 2, 25);
  }

  // Draw images
  const baselineImg = await loadImage(baselineImage);
  const currentImg = await loadImage(currentImage);

  ctx.drawImage(baselineImg, 0, 40, baseline.width, baseline.height);
  ctx.drawImage(currentImg, maxWidth, 40, current.width, current.height);

  if (diffImage) {
    const diffImg = await loadImage(diffImage);
    ctx.drawImage(diffImg, maxWidth * 2, 40);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Export diff image as blob for download
 */
export async function exportDiffImage(diffImage: string, filename?: string): Promise<void> {
  const link = document.createElement('a');
  link.href = diffImage;
  link.download = filename || `diff-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logger.log('[DiffEngine] Diff image exported:', link.download);
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(imageSrc: string): Promise<{
  width: number;
  height: number;
}> {
  const img = await loadImage(imageSrc);
  return {
    width: img.width,
    height: img.height,
  };
}

// ============================================
// Export Module
// ============================================

export const diffEngine = {
  compareScreenshots,
  quickCompare,
  generateComparisonImage,
  exportDiffImage,
  getImageDimensions,
};

export default diffEngine;
