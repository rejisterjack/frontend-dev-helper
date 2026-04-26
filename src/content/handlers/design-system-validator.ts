import designSystemValidator from '../design-system-validator';
import { createToolHandlers } from './shared';

export const designSystemValidatorHandlers = {
  ...createToolHandlers(
    'DESIGN_SYSTEM_VALIDATOR',
    designSystemValidator,
    'isDesignSystemValidatorActive',
  ),
  DESIGN_SYSTEM_VALIDATOR_VALIDATE: (_payload, _state, sendResponse) => {
    const report = designSystemValidator.validate();
    sendResponse({ success: true, report });
  },
};
