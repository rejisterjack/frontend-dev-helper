import { contrastChecker } from '../contrast-checker';
import { createToolHandlers } from './shared';

export const contrastCheckerHandlers = {
  ...createToolHandlers('CONTRAST_CHECKER', contrastChecker, 'isContrastCheckerActive'),
};
