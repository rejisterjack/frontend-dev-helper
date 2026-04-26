import { cssInspector } from '../css-inspector';
import { createToolHandlers } from './shared';

export const cssInspectorHandlers = {
  ...createToolHandlers('CSS_INSPECTOR', cssInspector, 'isCssInspectorActive'),
};
