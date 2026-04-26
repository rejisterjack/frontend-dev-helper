import * as smartElementPicker from '../smart-element-picker';
import { createToolHandlers } from './shared';

export const smartElementPickerHandlers = {
  ...createToolHandlers('SMART_ELEMENT_PICKER', smartElementPicker, 'isSmartElementPickerActive'),
  SMART_ELEMENT_PICKER_INSPECT: (payload, _state, sendResponse) => {
    const { selector } = payload as { selector: string };
    const element = document.querySelector(selector) as HTMLElement | null;
    if (element) {
      const info = smartElementPicker.inspectElement(element);
      sendResponse({ success: true, info });
    } else {
      sendResponse({ success: false, error: 'Element not found' });
    }
  },
};
