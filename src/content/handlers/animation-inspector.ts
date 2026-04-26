import { animationInspector } from '../animation-inspector';
import { createToolHandlers } from './shared';

export const animationInspectorHandlers = {
  ...createToolHandlers('ANIMATION_INSPECTOR', animationInspector, 'isAnimationInspectorActive'),
};
