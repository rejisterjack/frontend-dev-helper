import { commandPalette } from '../command-palette';
import { createToolHandlers } from './shared';

export const commandPaletteHandlers = {
  ...createToolHandlers('COMMAND_PALETTE', commandPalette, 'isCommandPaletteActive'),
};
