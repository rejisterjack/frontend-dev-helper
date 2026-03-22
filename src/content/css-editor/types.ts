/**
 * Live CSS Editor - Types and Interfaces
 */

export type CSSPropertyType = 'text' | 'number' | 'color' | 'select' | 'slider';

export interface CSSPropertyDefinition {
  name: string;
  type: CSSPropertyType;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue?: string;
}

export interface CSSPropertyCategory {
  name: string;
  icon: string;
  properties: CSSPropertyDefinition[];
}

export interface CSSEdit {
  property: string;
  oldValue: string;
  newValue: string;
  timestamp: number;
}

export interface ElementStyles {
  element: HTMLElement;
  selector: string;
  originalStyles: Map<string, string>;
  modifiedStyles: Map<string, string>;
  edits: CSSEdit[];
}

export interface CSSEditorState {
  enabled: boolean;
  selectedElement: HTMLElement | null;
  activeCategory: string;
  history: CSSEdit[];
  historyIndex: number;
  modifiedElements: Map<HTMLElement, ElementStyles>;
}

export interface CSSEditorOptions {
  highlightColor?: string;
  maxHistorySize?: number;
  onElementSelect?: (element: HTMLElement) => void;
  onStyleChange?: (element: HTMLElement, property: string, value: string) => void;
}

// Event handler types
export type MouseMoveHandler = (e: MouseEvent) => void;
export type ClickHandler = (e: MouseEvent) => void;
export type KeyDownHandler = (e: KeyboardEvent) => void;
export type ResizeHandler = () => void;
