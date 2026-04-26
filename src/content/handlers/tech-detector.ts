import { techDetector } from '../tech-detector';
import { createToolHandlers } from './shared';

export const techDetectorHandlers = {
  ...createToolHandlers('TECH_DETECTOR', techDetector, 'isTechDetectorActive'),
};
