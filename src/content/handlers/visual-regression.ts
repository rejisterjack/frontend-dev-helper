import { visualRegression } from '../visual-regression';
import { createToolHandlers } from './shared';

export const visualRegressionHandlers = {
  ...createToolHandlers('VISUAL_REGRESSION', visualRegression, 'isVisualRegressionActive'),
};
