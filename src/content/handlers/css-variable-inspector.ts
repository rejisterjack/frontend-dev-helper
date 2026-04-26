import * as cssVariableInspector from '../css-variable-inspector';
import { createToolHandlers } from './shared';

export const cssVariableInspectorHandlers = {
  ...createToolHandlers(
    'CSS_VARIABLE_INSPECTOR',
    cssVariableInspector,
    'isCssVariableInspectorActive',
  ),
  CSS_VARIABLE_INSPECTOR_SCAN: (_payload, _state, sendResponse) => {
    const variables = cssVariableInspector.detectCSSVariables();
    sendResponse({ success: true, variables });
  },
  CSS_VARIABLE_INSPECTOR_EXPORT: (payload, _state, sendResponse) => {
    const { format } = payload as { format: 'json' | 'css' | 'figma' };
    const data = cssVariableInspector.exportVariables(format);
    sendResponse({ success: true, data });
  },
};
