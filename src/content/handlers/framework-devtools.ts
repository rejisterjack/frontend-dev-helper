import * as frameworkDevtools from '../framework-devtools';
import { createToolHandlers } from './shared';

export const frameworkDevtoolsHandlers = {
  ...createToolHandlers('FRAMEWORK_DEVTOOLS', frameworkDevtools, 'isFrameworkDevtoolsActive'),
  FRAMEWORK_DEVTOOLS_DETECT: (_payload, _state, sendResponse) => {
    const frameworks = frameworkDevtools.detectAll();
    sendResponse({ success: true, frameworks });
  },
  FRAMEWORK_DEVTOOLS_GET_COMPONENT_TREE: (_payload, _state, sendResponse) => {
    const tree = frameworkDevtools.getReactComponentTree();
    sendResponse({ success: true, tree });
  },
};
