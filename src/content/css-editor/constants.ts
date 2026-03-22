/**
 * Live CSS Editor - Constants and Configuration
 */

import type { CSSEditorOptions, CSSPropertyCategory } from './types';

export const MAX_HISTORY_SIZE = 50;

export const DEFAULT_OPTIONS: Required<CSSEditorOptions> = {
  highlightColor: '#8b5cf6',
  maxHistorySize: 50,
  onElementSelect: () => {},
  onStyleChange: () => {},
};

export const CSS_CATEGORIES: CSSPropertyCategory[] = [
  {
    name: 'Layout',
    icon: '⊞',
    properties: [
      {
        name: 'display',
        type: 'select',
        options: [
          'block',
          'inline',
          'inline-block',
          'flex',
          'grid',
          'none',
          'contents',
          'table',
          'table-cell',
        ],
      },
      {
        name: 'position',
        type: 'select',
        options: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      },
      { name: 'top', type: 'text' },
      { name: 'right', type: 'text' },
      { name: 'bottom', type: 'text' },
      { name: 'left', type: 'text' },
      { name: 'width', type: 'text' },
      { name: 'height', type: 'text' },
      { name: 'min-width', type: 'text' },
      { name: 'min-height', type: 'text' },
      { name: 'max-width', type: 'text' },
      { name: 'max-height', type: 'text' },
      { name: 'margin', type: 'text' },
      { name: 'padding', type: 'text' },
      { name: 'z-index', type: 'number' },
      { name: 'overflow', type: 'select', options: ['visible', 'hidden', 'scroll', 'auto'] },
      { name: 'box-sizing', type: 'select', options: ['content-box', 'border-box'] },
      { name: 'float', type: 'select', options: ['none', 'left', 'right'] },
      { name: 'clear', type: 'select', options: ['none', 'left', 'right', 'both'] },
    ],
  },
  {
    name: 'Typography',
    icon: 'T',
    properties: [
      { name: 'color', type: 'color' },
      { name: 'font-family', type: 'text' },
      { name: 'font-size', type: 'text' },
      {
        name: 'font-weight',
        type: 'select',
        options: [
          '100',
          '200',
          '300',
          '400',
          '500',
          '600',
          '700',
          '800',
          '900',
          'normal',
          'bold',
          'lighter',
          'bolder',
        ],
      },
      { name: 'font-style', type: 'select', options: ['normal', 'italic', 'oblique'] },
      { name: 'line-height', type: 'text' },
      { name: 'letter-spacing', type: 'text' },
      { name: 'word-spacing', type: 'text' },
      { name: 'text-align', type: 'select', options: ['left', 'center', 'right', 'justify'] },
      {
        name: 'text-decoration',
        type: 'select',
        options: ['none', 'underline', 'overline', 'line-through'],
      },
      {
        name: 'text-transform',
        type: 'select',
        options: ['none', 'capitalize', 'uppercase', 'lowercase'],
      },
      {
        name: 'white-space',
        type: 'select',
        options: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line'],
      },
      { name: 'text-overflow', type: 'select', options: ['clip', 'ellipsis'] },
    ],
  },
  {
    name: 'Colors',
    icon: '🎨',
    properties: [
      { name: 'background-color', type: 'color' },
      { name: 'background-image', type: 'text' },
      { name: 'background-size', type: 'select', options: ['auto', 'cover', 'contain'] },
      { name: 'background-position', type: 'text' },
      {
        name: 'background-repeat',
        type: 'select',
        options: ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round'],
      },
      { name: 'border-color', type: 'color' },
      { name: 'border-width', type: 'text' },
      {
        name: 'border-style',
        type: 'select',
        options: [
          'none',
          'solid',
          'dashed',
          'dotted',
          'double',
          'groove',
          'ridge',
          'inset',
          'outset',
        ],
      },
      { name: 'border-radius', type: 'text' },
      { name: 'opacity', type: 'slider', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    name: 'Flexbox',
    icon: '↔',
    properties: [
      {
        name: 'flex-direction',
        type: 'select',
        options: ['row', 'row-reverse', 'column', 'column-reverse'],
      },
      { name: 'flex-wrap', type: 'select', options: ['nowrap', 'wrap', 'wrap-reverse'] },
      {
        name: 'justify-content',
        type: 'select',
        options: [
          'flex-start',
          'flex-end',
          'center',
          'space-between',
          'space-around',
          'space-evenly',
        ],
      },
      {
        name: 'align-items',
        type: 'select',
        options: ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'],
      },
      {
        name: 'align-content',
        type: 'select',
        options: [
          'stretch',
          'flex-start',
          'flex-end',
          'center',
          'space-between',
          'space-around',
          'space-evenly',
        ],
      },
      { name: 'flex-grow', type: 'number', min: 0 },
      { name: 'flex-shrink', type: 'number', min: 0 },
      { name: 'flex-basis', type: 'text' },
      {
        name: 'align-self',
        type: 'select',
        options: ['auto', 'flex-start', 'flex-end', 'center', 'baseline', 'stretch'],
      },
      { name: 'order', type: 'number' },
      { name: 'gap', type: 'text' },
    ],
  },
  {
    name: 'Effects',
    icon: '✨',
    properties: [
      { name: 'box-shadow', type: 'text' },
      { name: 'text-shadow', type: 'text' },
      { name: 'transform', type: 'text' },
      { name: 'transition', type: 'text' },
      { name: 'filter', type: 'text' },
      {
        name: 'cursor',
        type: 'select',
        options: [
          'auto',
          'default',
          'pointer',
          'text',
          'wait',
          'move',
          'not-allowed',
          'grab',
          'crosshair',
        ],
      },
      { name: 'pointer-events', type: 'select', options: ['auto', 'none'] },
      { name: 'user-select', type: 'select', options: ['auto', 'none', 'text', 'all'] },
      { name: 'visibility', type: 'select', options: ['visible', 'hidden', 'collapse'] },
    ],
  },
];

export const CSS_ANIMATIONS = `
  @keyframes fdh-slide-up {
    from { transform: translate(-50%, 100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes fdh-fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  .fdh-css-editor-panel input:focus,
  .fdh-css-editor-panel select:focus {
    outline: none;
    border-color: rgba(99, 102, 241, 0.5) !important;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  .fdh-css-editor-panel button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.1);
  }
  .fdh-css-editor-panel button:active:not(:disabled) {
    transform: translateY(0);
  }
`;
