import { pixelRuler } from '../pixel-ruler';
import { createToolHandlers } from './shared';

export const pixelRulerHandlers = {
  ...createToolHandlers('PIXEL_RULER', pixelRuler, 'isPixelRulerActive'),
  PIXEL_RULER_CLEAR: (_payload, _state, sendResponse) => {
    pixelRuler.clearAllMeasurements();
    sendResponse({ success: true });
  },
};
