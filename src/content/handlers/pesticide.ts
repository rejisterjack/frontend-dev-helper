import { pesticide } from '../pesticide';
import { createToolHandlers } from './shared';

export const pesticideHandlers = {
  ...createToolHandlers('PESTICIDE', pesticide, 'isDomOutlinerActive'),
  PESTICIDE_SET_TAG_VISIBILITY: (payload, _state, sendResponse) => {
    if (payload?.tag !== undefined && payload?.visible !== undefined) {
      pesticide.toggleTag(String(payload.tag), Boolean(payload.visible));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing tag or visible parameter' });
    }
  },
};
