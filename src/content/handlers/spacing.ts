import { spacingVisualizer } from '../spacing';
import { createToolHandlers } from './shared';

export const spacingHandlers = {
  ...createToolHandlers('SPACING', spacingVisualizer, 'isSpacingVisualizerActive'),
};
