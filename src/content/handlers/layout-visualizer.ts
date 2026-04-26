import { layoutVisualizer } from '../layout-visualizer';
import { createToolHandlers } from './shared';

export const layoutVisualizerHandlers = {
  ...createToolHandlers('LAYOUT_VISUALIZER', layoutVisualizer, 'isLayoutVisualizerActive'),
};
