import { flameGraph } from '../flame-graph';
import { createToolHandlers } from './shared';

export const flameGraphHandlers = {
  ...createToolHandlers('FLAME_GRAPH', flameGraph, 'isFlameGraphActive'),
  FLAME_GRAPH_REFRESH: (_payload, _state, sendResponse) => {
    flameGraph.refresh();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_START_PROFILING: (_payload, _state, sendResponse) => {
    flameGraph.startProfiling();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_STOP_PROFILING: (_payload, _state, sendResponse) => {
    flameGraph.stopProfiling();
    sendResponse({ success: true });
  },
  FLAME_GRAPH_SET_THRESHOLD: (payload, _state, sendResponse) => {
    if (payload?.threshold !== undefined) {
      flameGraph.setFilterThreshold(Number(payload.threshold));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'Missing threshold parameter' });
    }
  },
  FLAME_GRAPH_EXPORT: (_payload, _state, sendResponse) => {
    flameGraph.exportProfile();
    sendResponse({ success: true });
  },
};
