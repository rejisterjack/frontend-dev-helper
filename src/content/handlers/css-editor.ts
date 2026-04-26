import { cssEditor } from '../css-editor';
import { createToolHandlers } from './shared';

export const cssEditorHandlers = {
  ...createToolHandlers('CSS_EDITOR', cssEditor, 'isCssEditorActive'),
  CSS_EDITOR_GET_CSS: (_payload, _state, sendResponse) => {
    sendResponse({ success: true, css: cssEditor.getModifiedCSS() });
  },
  CSS_EDITOR_RESET: (_payload, _state, sendResponse) => {
    cssEditor.resetAll();
    sendResponse({ success: true });
  },
};
