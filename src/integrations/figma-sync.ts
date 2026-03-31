/**
 * Figma Design Token Sync
 *
 * Extract design tokens from Figma files
 * Compare live CSS values against design tokens
 * Export validated tokens back to Figma
 */

import { logger } from '@/utils/logger';

// Figma API Types
export interface FigmaFile {
  key: string;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  styles?: Record<string, string>;
  fills?: unknown[];
  strokes?: unknown[];
  strokeWeight?: number;
  cornerRadius?: number;
  children?: FigmaNode[];
}

export interface DesignToken {
  name: string;
  type: 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'other';
  value: unknown;
  description?: string;
  figmaId?: string;
}

export interface ColorToken extends DesignToken {
  type: 'color';
  value: {
    r: number;
    g: number;
    b: number;
    a: number;
    hex: string;
  };
}

export interface TypographyToken extends DesignToken {
  type: 'typography';
  value: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number | 'auto';
    letterSpacing: number;
  };
}

export interface SpacingToken extends DesignToken {
  type: 'spacing';
  value: number;
}

export interface ShadowToken extends DesignToken {
  type: 'shadow';
  value: {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: { r: number; g: number; b: number; a: number; hex: string };
  };
}

export type DesignTokens = {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  shadows: ShadowToken[];
  other: DesignToken[];
};

export interface TokenValidationResult {
  token: DesignToken;
  element: string;
  actualValue: unknown;
  expectedValue: unknown;
  match: boolean;
  deviation?: number;
}

// Figma API Client
class FigmaAPI {
  private accessToken: string;
  private baseURL = 'https://api.figma.com/v1';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'X-Figma-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getFile(fileKey: string): Promise<{
    document: FigmaNode;
    components: Record<string, unknown>;
    styles: Record<string, unknown>;
  }> {
    return this.request(`/files/${fileKey}`);
  }

  async getFileNodes(fileKey: string, nodeIds: string[]): Promise<{ nodes: Record<string, { document: FigmaNode }> }> {
    return this.request(`/files/${fileKey}/nodes?ids=${nodeIds.join(',')}`);
  }

  async getTeamProjects(teamId: string): Promise<{ projects: Array<{ id: string; name: string }> }> {
    return this.request(`/teams/${teamId}/projects`);
  }

  async getProjectFiles(projectId: string): Promise<{ files: FigmaFile[] }> {
    return this.request(`/projects/${projectId}/files`);
  }
}

// Convert Figma color to hex
function figmaColorToHex(color: { r: number; g: number; b: number; a?: number }): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  return color.a !== undefined && color.a < 1 ? `${hex}${toHex(color.a)}` : hex;
}

// Extract design tokens from Figma node
function extractTokensFromNode(node: FigmaNode, prefix = ''): DesignToken[] {
  const tokens: DesignToken[] = [];
  const name = prefix ? `${prefix}/${node.name}` : node.name;

  // Extract color from fills
  if (node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      const f = fill as { type: string; color?: { r: number; g: number; b: number; a: number } };
      if (f.type === 'SOLID' && f.color) {
        tokens.push({
          name: `${name}/color`,
          type: 'color',
          value: {
            ...f.color,
            hex: figmaColorToHex(f.color),
          },
          figmaId: node.id,
        } as ColorToken);
      }
    }
  }

  // Extract typography
  const style = node as unknown as {
    style?: {
      fontFamily?: string;
      fontSize?: number;
      fontWeight?: number;
      lineHeightPercentFontSize?: number;
      letterSpacing?: number;
    };
  };
  if (style.style) {
    tokens.push({
      name: `${name}/typography`,
      type: 'typography',
      value: {
        fontFamily: style.style.fontFamily || 'Inter',
        fontSize: style.style.fontSize || 16,
        fontWeight: style.style.fontWeight || 400,
        lineHeight: style.style.lineHeightPercentFontSize
          ? style.style.lineHeightPercentFontSize / 100
          : 'auto',
        letterSpacing: style.style.letterSpacing || 0,
      },
      figmaId: node.id,
    } as TypographyToken);
  }

  // Extract spacing from absoluteBoundingBox (would need actual dimensions)
  if (node.type === 'FRAME' || node.type === 'COMPONENT') {
    const frameNode = node as unknown as {
      absoluteBoundingBox?: { width: number; height: number };
      paddingLeft?: number;
      paddingRight?: number;
      paddingTop?: number;
      paddingBottom?: number;
      itemSpacing?: number;
    };
    if (frameNode.itemSpacing !== undefined) {
      tokens.push({
        name: `${name}/spacing`,
        type: 'spacing',
        value: frameNode.itemSpacing,
        figmaId: node.id,
      } as SpacingToken);
    }
  }

  // Extract corner radius
  if (node.cornerRadius !== undefined) {
    tokens.push({
      name: `${name}/border-radius`,
      type: 'spacing',
      value: node.cornerRadius,
      figmaId: node.id,
    } as SpacingToken);
  }

  // Extract shadows
  const effectsNode = node as unknown as {
    effects?: Array<{
      type: 'DROP_SHADOW' | 'INNER_SHADOW';
      offset: { x: number; y: number };
      radius: number;
      spread?: number;
      color?: { r: number; g: number; b: number; a: number };
    }>;
  };
  if (effectsNode.effects) {
    for (const effect of effectsNode.effects) {
      if (effect.type === 'DROP_SHADOW' && effect.color) {
        tokens.push({
          name: `${name}/shadow`,
          type: 'shadow',
          value: {
            x: effect.offset.x,
            y: effect.offset.y,
            blur: effect.radius,
            spread: effect.spread || 0,
            color: { ...effect.color, hex: figmaColorToHex(effect.color) },
          },
          figmaId: node.id,
        } as ShadowToken);
      }
    }
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      tokens.push(...extractTokensFromNode(child, name));
    }
  }

  return tokens;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'figma_access_token',
  SYNCED_FILES: 'figma_synced_files',
  EXTRACTED_TOKENS: 'figma_extracted_tokens',
  VALIDATION_HISTORY: 'figma_validation_history',
};

/**
 * Set Figma access token
 */
export async function setAccessToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.ACCESS_TOKEN]: token });
}

/**
 * Get Figma access token
 */
export async function getAccessToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACCESS_TOKEN);
  return result[STORAGE_KEYS.ACCESS_TOKEN] || null;
}

/**
 * Sync design tokens from Figma file
 */
export async function syncFromFigma(fileKey: string): Promise<DesignTokens> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Figma access token not set');
  }

  const api = new FigmaAPI(token);
  const file = await api.getFile(fileKey);

  // Extract tokens from document
  const allTokens = extractTokensFromNode(file.document);

  // Categorize tokens
  const tokens: DesignTokens = {
    colors: allTokens.filter((t): t is ColorToken => t.type === 'color'),
    typography: allTokens.filter((t): t is TypographyToken => t.type === 'typography'),
    spacing: allTokens.filter((t): t is SpacingToken => t.type === 'spacing'),
    shadows: allTokens.filter((t): t is ShadowToken => t.type === 'shadow'),
    other: allTokens.filter((t) => !['color', 'typography', 'spacing', 'shadow'].includes(t.type)),
  };

  // Save to storage
  await chrome.storage.local.set({
    [STORAGE_KEYS.EXTRACTED_TOKENS]: tokens,
    [STORAGE_KEYS.SYNCED_FILES]: [
      ...(await getSyncedFiles()),
      { key: fileKey, name: file.document.name, syncedAt: Date.now() },
    ],
  });

  logger.log('[FigmaSync] Synced', allTokens.length, 'tokens from', fileKey);
  return tokens;
}

/**
 * Get synced files
 */
export async function getSyncedFiles(): Promise<Array<{ key: string; name: string; syncedAt: number }>> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SYNCED_FILES);
  return result[STORAGE_KEYS.SYNCED_FILES] || [];
}

/**
 * Get extracted tokens
 */
export async function getExtractedTokens(): Promise<DesignTokens | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.EXTRACTED_TOKENS);
  return result[STORAGE_KEYS.EXTRACTED_TOKENS] || null;
}

/**
 * Validate current page against design tokens
 */
export async function validateAgainstTokens(tokens?: DesignTokens): Promise<TokenValidationResult[]> {
  const designTokens = tokens || (await getExtractedTokens());
  if (!designTokens) {
    throw new Error('No design tokens available. Sync from Figma first.');
  }

  const results: TokenValidationResult[] = [];

  // Validate colors
  const allElements = document.querySelectorAll('*');
  const computedColors = new Map<string, string[]>();

  for (const el of allElements) {
    const computed = window.getComputedStyle(el);
    const bgColor = computed.backgroundColor;
    const textColor = computed.color;
    const borderColor = computed.borderColor;

    for (const color of [bgColor, textColor, borderColor]) {
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        if (!computedColors.has(color)) {
          computedColors.set(color, []);
        }
        computedColors.get(color)!.push(generateSelector(el));
      }
    }
  }

  // Check color matches
  for (const token of designTokens.colors) {
    const tokenHex = token.value.hex.toLowerCase();
    let found = false;

    for (const [computedColor, elements] of computedColors) {
      const computedHex = rgbToHex(computedColor);
      if (colorDistance(tokenHex, computedHex) < 5) {
        found = true;
        results.push({
          token,
          element: elements[0],
          actualValue: computedHex,
          expectedValue: tokenHex,
          match: true,
        });
      }
    }

    if (!found) {
      results.push({
        token,
        element: 'N/A',
        actualValue: 'Not found',
        expectedValue: tokenHex,
        match: false,
      });
    }
  }

  // Validate typography
  for (const token of designTokens.typography) {
    const elements = document.querySelectorAll(
      `[style*="font-size: ${token.value.fontSize}px"], ` +
      `[style*="font-size:${token.value.fontSize}px"]`
    );

    if (elements.length > 0) {
      results.push({
        token,
        element: generateSelector(elements[0]),
        actualValue: `${token.value.fontSize}px`,
        expectedValue: `${token.value.fontSize}px`,
        match: true,
      });
    }
  }

  // Save validation history
  const history = await getValidationHistory();
  history.unshift({
    timestamp: Date.now(),
    url: window.location.href,
    totalTokens: results.length,
    matchedTokens: results.filter((r) => r.match).length,
  });
  await chrome.storage.local.set({ [STORAGE_KEYS.VALIDATION_HISTORY]: history.slice(0, 50) });

  logger.log('[FigmaSync] Validated', results.length, 'tokens');
  return results;
}

/**
 * Get validation history
 */
export async function getValidationHistory(): Promise<
  Array<{ timestamp: number; url: string; totalTokens: number; matchedTokens: number }>
> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.VALIDATION_HISTORY);
  return result[STORAGE_KEYS.VALIDATION_HISTORY] || [];
}

/**
 * Export tokens to Figma
 */
export async function exportToFigma(
  fileKey: string,
  tokens: Partial<DesignTokens>
): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Figma access token not set');
  }

  // In a real implementation, this would create/update styles in Figma
  // For now, we'll generate a JSON file that can be imported

  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    tokens,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tokens-${fileKey}.json`;
  a.click();
  URL.revokeObjectURL(url);

  logger.log('[FigmaSync] Exported tokens for', fileKey);
}

/**
 * Generate CSS variables from tokens
 */
export function generateCSSVariables(tokens: DesignTokens): string {
  const lines: string[] = [':root {'];

  // Colors
  for (const token of tokens.colors) {
    const varName = `--color-${token.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
    lines.push(`  ${varName}: ${token.value.hex};`);
  }

  // Typography
  for (const token of tokens.typography) {
    const baseName = `--text-${token.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
    lines.push(`  ${baseName}-size: ${token.value.fontSize}px;`);
    lines.push(`  ${baseName}-weight: ${token.value.fontWeight};`);
    if (token.value.lineHeight !== 'auto') {
      lines.push(`  ${baseName}-line-height: ${token.value.lineHeight};`);
    }
    lines.push(`  ${baseName}-letter-spacing: ${token.value.letterSpacing}px;`);
  }

  // Spacing
  for (const token of tokens.spacing) {
    const varName = `--spacing-${token.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
    lines.push(`  ${varName}: ${token.value}px;`);
  }

  // Shadows
  for (const token of tokens.shadows) {
    const varName = `--shadow-${token.name.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase()}`;
    const shadow = `${token.value.x}px ${token.value.y}px ${token.value.blur}px ${token.value.spread}px ${token.value.color.hex}`;
    lines.push(`  ${varName}: ${shadow};`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate token difference report
 */
export function generateDiffReport(
  _expected: DesignTokens,
  actual: TokenValidationResult[]
): { summary: string; details: TokenValidationResult[] } {
  const total = actual.length;
  const matched = actual.filter((r) => r.match).length;
  const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

  const summary = `${matched}/${total} tokens matched (${percentage}%)`;

  return {
    summary,
    details: actual.sort((a, b) => (a.match === b.match ? 0 : a.match ? 1 : -1)),
  };
}

// Helper: RGB to Hex
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return rgb;

  const [, r, g, b] = match;
  return `#${Number(r).toString(16).padStart(2, '0')}${Number(g).toString(16).padStart(2, '0')}${Number(b).toString(16).padStart(2, '0')}`;
}

// Helper: Color distance (simple Euclidean in RGB space)
function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);

  if (!rgb1 || !rgb2) return Infinity;

  return Math.sqrt(
    (rgb1.r - rgb2.r) ** 2 +
    (rgb1.g - rgb2.g) ** 2 +
    (rgb1.b - rgb2.b) ** 2
  );
}

// Helper: Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

// Helper: Generate CSS selector
function generateSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  if (el.className) {
    const classes = el.className.toString().split(' ').slice(0, 2).join('.');
    return `.${classes}`;
  }
  return el.tagName.toLowerCase();
}

// Default export
export default {
  setAccessToken,
  getAccessToken,
  syncFromFigma,
  getSyncedFiles,
  getExtractedTokens,
  validateAgainstTokens,
  getValidationHistory,
  exportToFigma,
  generateCSSVariables,
  generateDiffReport,
};
