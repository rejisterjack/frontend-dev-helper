/**
 * Image Diff Worker
 *
 * Web Worker for offloading image pixel comparison from the main thread.
 * Used by the visual regression tool for comparing screenshots.
 */

// Worker message types
interface DiffRequest {
  type: 'COMPARE_IMAGES';
  id: string;
  baseline: ImageData;
  current: ImageData;
  threshold: number;
  ignoreRegions?: Array<{ x: number; y: number; width: number; height: number }>;
}

interface DiffResponse {
  type: 'COMPARE_RESULT';
  id: string;
  diffPercentage: number;
  passed: boolean;
  diffImageData?: ImageData;
  error?: string;
}

interface Pixel {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Get pixel at coordinates
function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): Pixel {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

// Set pixel at coordinates
function setPixel(data: Uint8ClampedArray, width: number, x: number, y: number, pixel: Pixel): void {
  const index = (y * width + x) * 4;
  data[index] = pixel.r;
  data[index + 1] = pixel.g;
  data[index + 2] = pixel.b;
  data[index + 3] = pixel.a;
}

// Check if pixel is in ignore region
function isInIgnoreRegion(
  x: number,
  y: number,
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }>
): boolean {
  for (const region of ignoreRegions) {
    if (
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height
    ) {
      return true;
    }
  }
  return false;
}

// Calculate color difference (squared Euclidean distance)
function colorDiff(p1: Pixel, p2: Pixel): number {
  return (
    (p1.r - p2.r) ** 2 +
    (p1.g - p2.g) ** 2 +
    (p1.b - p2.b) ** 2 +
    (p1.a - p2.a) ** 2
  );
}

// Anti-aliasing detection
function isAntiAliased(
  baseline: Uint8ClampedArray,
  current: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  const threshold = 0.1;
  const p1 = getPixel(baseline, width, x, y);
  const p2 = getPixel(current, width, x, y);

  // Check if pixel has similar neighbors in both images
  let similarInBaseline = 0;
  let similarInCurrent = 0;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const neighborBaseline = getPixel(baseline, width, nx, ny);
      const neighborCurrent = getPixel(current, width, nx, ny);

      if (colorDiff(p1, neighborBaseline) < threshold * 255 * 255) {
        similarInBaseline++;
      }
      if (colorDiff(p2, neighborCurrent) < threshold * 255 * 255) {
        similarInCurrent++;
      }
    }
  }

  // If both pixels have similar neighbors, likely anti-aliasing
  return similarInBaseline >= 3 && similarInCurrent >= 3;
}

// Compare images and generate diff
function compareImages(
  baseline: ImageData,
  current: ImageData,
  threshold: number,
  ignoreRegions: Array<{ x: number; y: number; width: number; height: number }> = []
): { diffPercentage: number; passed: boolean; diffImageData?: ImageData } {
  const width = Math.min(baseline.width, current.width);
  const height = Math.min(baseline.height, current.height);
  
  const maxDimension = Math.max(baseline.width, baseline.height, current.width, current.height);
  const dimensionDiff = Math.abs(baseline.width - current.width) + Math.abs(baseline.height - current.height);
  
  // Size mismatch penalty
  let sizeMismatchPixels = dimensionDiff * maxDimension;
  
  // Create diff image
  const diffData = new Uint8ClampedArray(width * height * 4);
  let diffPixels = 0;
  let totalPixels = width * height;

  // Threshold squared for comparison
  const thresholdSquared = (threshold * 255) ** 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip ignored regions
      if (isInIgnoreRegion(x, y, ignoreRegions)) {
        const p1 = getPixel(baseline.data, baseline.width, x, y);
        setPixel(diffData, width, x, y, p1);
        continue;
      }

      const p1 = getPixel(baseline.data, baseline.width, x, y);
      const p2 = getPixel(current.data, current.width, x, y);
      
      const diff = colorDiff(p1, p2);
      
      if (diff > thresholdSquared && !isAntiAliased(baseline.data, current.data, width, height, x, y)) {
        diffPixels++;
        // Mark diff pixel in magenta
        setPixel(diffData, width, x, y, { r: 255, g: 0, b: 255, a: 255 });
      } else {
        // Copy baseline pixel
        setPixel(diffData, width, x, y, p1);
      }
    }
  }

  // Calculate percentage including size mismatch
  totalPixels += sizeMismatchPixels;
  diffPixels += sizeMismatchPixels;
  
  const diffPercentage = (diffPixels / totalPixels) * 100;
  const passed = diffPercentage <= threshold * 100;

  return {
    diffPercentage,
    passed,
    diffImageData: new ImageData(diffData, width, height),
  };
}

// Worker message handler
self.onmessage = function (event: MessageEvent<DiffRequest>): void {
  const { type, id } = event.data;

  if (type === 'COMPARE_IMAGES') {
    try {
      const { baseline, current, threshold, ignoreRegions } = event.data;
      
      const result = compareImages(baseline, current, threshold, ignoreRegions);
      
      const response: DiffResponse = {
        type: 'COMPARE_RESULT',
        id,
        diffPercentage: result.diffPercentage,
        passed: result.passed,
        diffImageData: result.diffImageData,
      };
      
      self.postMessage(response);
    } catch (error) {
      const response: DiffResponse = {
        type: 'COMPARE_RESULT',
        id,
        diffPercentage: 0,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      self.postMessage(response);
    }
  }
};

// Export types for main thread usage
export type { DiffRequest, DiffResponse };
