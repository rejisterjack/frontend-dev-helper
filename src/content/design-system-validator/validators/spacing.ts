/**
 * Spacing Validation Utilities
 * Functions for parsing and validating spacing values
 */

export function parseValue(value: string): { num: number; unit: string } | null {
  if (value === '0' || value === '0px' || value === '0rem' || value === '0em') {
    return { num: 0, unit: 'px' };
  }
  const match = value.match(/^([\d.]+)(px|rem|em|%)?$/);
  if (!match) return null;
  return {
    num: Number.parseFloat(match[1]),
    unit: match[2] || 'px',
  };
}

export function convertToUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const baseFontSize = 16;
  if (fromUnit === 'rem' && toUnit === 'px') return value * baseFontSize;
  if (fromUnit === 'em' && toUnit === 'px') return value * baseFontSize;
  if (fromUnit === 'px' && toUnit === 'rem') return value / baseFontSize;
  if (fromUnit === 'px' && toUnit === 'em') return value / baseFontSize;
  return value;
}

export function isValueInScale(
  value: string,
  scale: number[],
  unit: string,
  tolerance = 1
): boolean {
  const parsed = parseValue(value);
  if (!parsed) return false;

  const valueInPx =
    parsed.unit === 'px' ? parsed.num : convertToUnit(parsed.num, parsed.unit, 'px');

  for (const scaleValue of scale) {
    const scaleInPx = unit === 'px' ? scaleValue : convertToUnit(scaleValue, unit, 'px');
    if (Math.abs(valueInPx - scaleInPx) <= tolerance) return true;
  }
  return false;
}
