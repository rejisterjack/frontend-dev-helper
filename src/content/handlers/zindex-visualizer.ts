import { zIndexVisualizer } from '../zindex-visualizer';
import { createToolHandlers } from './shared';

export const zIndexVisualizerHandlers = {
  ...createToolHandlers('ZINDEX_VISUALIZER', zIndexVisualizer, 'isZIndexVisualizerActive'),
};
