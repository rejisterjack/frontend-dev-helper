import { breakpointOverlay } from '../breakpoint-overlay';
import { createToolHandlers } from './shared';

export const breakpointOverlayHandlers = {
  ...createToolHandlers('BREAKPOINT_OVERLAY', breakpointOverlay, 'isBreakpointOverlayActive'),
  BREAKPOINT_OVERLAY_SET_FRAMEWORK: (payload, _state, sendResponse) => {
    if (payload?.framework) {
      breakpointOverlay.setFramework(payload.framework as 'tailwind' | 'bootstrap');
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing framework parameter' });
    }
  },
};
