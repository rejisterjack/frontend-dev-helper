import * as screenshotStudio from '../screenshot-studio';
import { createToolHandlers } from './shared';

export const screenshotStudioHandlers = {
  ...createToolHandlers('SCREENSHOT_STUDIO', screenshotStudio, 'isScreenshotStudioActive'),
};
