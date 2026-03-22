/**
 * Default export for Design System Validator
 */

import {
  clear,
  disable,
  enable,
  getState,
  setCustomTokens,
  setPreset,
  toggle,
  validate,
} from './core';
import { PRESETS } from './presets';

export default {
  enable,
  disable,
  toggle,
  getState,
  validate,
  setCustomTokens,
  setPreset,
  clear,
  PRESETS,
};
