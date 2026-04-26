import { colorPicker } from '../color-picker';
import { createToolHandlers } from './shared';

export const colorPickerHandlers = {
  ...createToolHandlers('COLOR_PICKER', colorPicker, 'isColorPickerActive'),
  COLOR_PICKER_SET_FORMAT: (payload, _state, sendResponse) => {
    if (payload?.format) {
      colorPicker.setFormat(payload.format as 'hex' | 'rgb' | 'hsl');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing format parameter' });
    }
  },
  COLOR_PICKER_EXTRACT_PALETTE: (_payload, _state, sendResponse) => {
    colorPicker.extractPalette();
    sendResponse({ success: true });
  },
};
