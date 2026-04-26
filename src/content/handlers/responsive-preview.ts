import { responsivePreview } from '../responsive-preview';
import { createToolHandlers } from './shared';

export const responsivePreviewHandlers = {
  ...createToolHandlers('RESPONSIVE_PREVIEW', responsivePreview, 'isResponsivePreviewActive'),
  RESPONSIVE_PREVIEW_SET_SYNC_SCROLL: (payload, _state, sendResponse) => {
    if (payload?.enabled !== undefined) {
      responsivePreview.setSyncScroll(Boolean(payload.enabled));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing enabled parameter' });
    }
  },
  RESPONSIVE_PREVIEW_SET_SCALE: (payload, _state, sendResponse) => {
    if (payload?.scale !== undefined) {
      responsivePreview.setGlobalScale(Number(payload.scale));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing scale parameter' });
    }
  },
};
