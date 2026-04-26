import { storageInspector } from '../storage-inspector';
import { createToolHandlers } from './shared';

export const storageInspectorHandlers = {
  ...createToolHandlers('STORAGE_INSPECTOR', storageInspector, 'isStorageInspectorActive'),
  STORAGE_INSPECTOR_REFRESH: (_payload, _state, sendResponse) => {
    storageInspector.refresh();
    sendResponse({ success: true });
  },
};
