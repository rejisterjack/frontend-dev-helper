/**
 * Design System Validator Types
 * Type definitions for the design system validator
 */

export interface SpacingConfig {
  scale: number[];
  unit: 'px' | 'rem' | 'em';
  tolerance?: number;
}

export interface ColorConfig {
  primary: string[];
  secondary: string[];
  neutral: string[];
  semantic: {
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
  };
  custom?: Record<string, string[]>;
}

export interface TypographyConfig {
  fontSizes: number[];
  fontWeights: number[];
  lineHeights: number[];
  fontFamilies: string[];
  unit: 'px' | 'rem' | 'em';
}

export interface BorderRadiusConfig {
  values: number[];
  unit: 'px' | 'rem' | 'em' | '%';
}

export interface ShadowConfig {
  values: string[];
}

export interface DesignSystemTokens {
  name: string;
  spacing: SpacingConfig;
  colors: ColorConfig;
  typography: TypographyConfig;
  borderRadius: BorderRadiusConfig;
  shadows: ShadowConfig;
}

export interface Violation {
  id: string;
  type: 'spacing' | 'color' | 'typography' | 'borderRadius' | 'shadow';
  element: HTMLElement;
  property: string;
  actualValue: string;
  expectedValues: string[];
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationReport {
  url: string;
  timestamp: number;
  totalElements: number;
  violations: Violation[];
  stats: {
    spacing: { valid: number; invalid: number };
    color: { valid: number; invalid: number };
    typography: { valid: number; invalid: number };
    borderRadius: { valid: number; invalid: number };
    shadow: { valid: number; invalid: number };
  };
  tokenUsage: {
    spacing: Record<string, number>;
    colors: Record<string, number>;
    fontSizes: Record<string, number>;
    fontWeights: Record<string, number>;
    borderRadius: Record<string, number>;
  };
}

export interface ValidatorState {
  enabled: boolean;
  highlightingEnabled: boolean;
  currentPreset: string;
  customTokens: DesignSystemTokens | null;
  violations: Violation[];
  report: ValidationReport | null;
}
