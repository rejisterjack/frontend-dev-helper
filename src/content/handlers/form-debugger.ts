import { formDebugger } from '../form-debugger';
import { createToolHandlers } from './shared';

export const formDebuggerHandlers = {
  ...createToolHandlers('FORM_DEBUGGER', formDebugger, 'isFormDebuggerActive'),
  FORM_DEBUGGER_REFRESH: (_payload, _state, sendResponse) => {
    formDebugger.refresh();
    sendResponse({ success: true });
  },
  FORM_DEBUGGER_SET_HIGHLIGHT: (payload, _state, sendResponse) => {
    if (payload?.enabled !== undefined) {
      formDebugger.setHighlightIssues(Boolean(payload.enabled));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing enabled parameter' });
    }
  },
};
