import { networkAnalyzer } from '../network-analyzer';
import { createToolHandlers } from './shared';

export const networkAnalyzerHandlers = {
  ...createToolHandlers('NETWORK_ANALYZER', networkAnalyzer, 'isNetworkAnalyzerActive'),
  NETWORK_ANALYZER_CLEAR: (_payload, _state, sendResponse) => {
    networkAnalyzer.clear();
    sendResponse({ success: true });
  },
};
