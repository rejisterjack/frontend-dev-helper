import { aiSuggestions } from '../ai-suggestions';
import { createToolHandlers } from './shared';

export const smartSuggestionsHandlers = {
  ...createToolHandlers('SMART_SUGGESTIONS', aiSuggestions, 'isSmartSuggestionsActive'),
  SMART_SUGGESTIONS_RUN_ANALYSIS: (_payload, _state, sendResponse) => {
    aiSuggestions.runAnalysis();
    sendResponse({ success: true });
  },
};
