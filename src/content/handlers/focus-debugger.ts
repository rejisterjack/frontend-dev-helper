import { focusDebugger } from '../focus-debugger';
import { createToolHandlers } from './shared';

export const focusDebuggerHandlers = {
  ...createToolHandlers('FOCUS_DEBUGGER', focusDebugger, 'isFocusDebuggerActive'),
  FOCUS_DEBUGGER_REFRESH: (_payload, _state, sendResponse) => {
    focusDebugger.refresh();
    sendResponse({ success: true });
  },
  FOCUS_DEBUGGER_CLEAR_HISTORY: (_payload, _state, sendResponse) => {
    focusDebugger.clearHistory();
    sendResponse({ success: true });
  },
};
