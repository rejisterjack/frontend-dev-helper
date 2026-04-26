import { componentTree } from '../component-tree';
import { createToolHandlers } from './shared';

export const componentTreeHandlers = {
  ...createToolHandlers('COMPONENT_TREE', componentTree, 'isComponentTreeActive'),
  COMPONENT_TREE_REFRESH: (_payload, _state, sendResponse) => {
    componentTree.refresh();
    sendResponse({ success: true });
  },
};
