import { fontInspector } from '../font-inspector';
import { createToolHandlers } from './shared';

export const fontInspectorHandlers = {
  ...createToolHandlers('FONT_INSPECTOR', fontInspector, 'isFontInspectorActive'),
};
