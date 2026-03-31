/**
 * Command Palette Tests
 */

import { describe, expect, it } from 'vitest';
import {
  getAllCommands,
  getCommandById,
  searchCommands,
} from '../../src/components/CommandPalette/commands';

describe('Command Palette', () => {
  describe('getAllCommands', () => {
    it('should return all available commands', () => {
      const commands = getAllCommands();
      expect(commands.length).toBeGreaterThan(20);
    });

    it('should include tool commands', () => {
      const commands = getAllCommands();
      const toolCommands = commands.filter(c => c.category === 'tool');
      expect(toolCommands.length).toBeGreaterThan(15);
    });

    it('should include action commands', () => {
      const commands = getAllCommands();
      const actionCommands = commands.filter(c => c.category === 'action');
      expect(actionCommands.length).toBeGreaterThan(0);
    });

    it('should include setting commands', () => {
      const commands = getAllCommands();
      const settingCommands = commands.filter(c => c.category === 'setting');
      expect(settingCommands.length).toBeGreaterThan(0);
    });
  });

  describe('searchCommands', () => {
    it('should find commands by title', () => {
      const results = searchCommands('dom outliner');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title.toLowerCase()).toContain('dom');
    });

    it('should find commands by keywords', () => {
      const results = searchCommands('color pick');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return all commands when query is empty', () => {
      const results = searchCommands('');
      const allCommands = getAllCommands();
      expect(results.length).toBe(allCommands.length);
    });

    it('should handle fuzzy search', () => {
      const results = searchCommands('storage local');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getCommandById', () => {
    it('should return command by ID', () => {
      const command = getCommandById('toggle-dom-outliner');
      expect(command).toBeDefined();
      expect(command?.id).toBe('toggle-dom-outliner');
    });

    it('should return undefined for unknown ID', () => {
      const command = getCommandById('unknown-command');
      expect(command).toBeUndefined();
    });

    it('should include new tool commands', () => {
      const commandPaletteCmd = getCommandById('toggle-command-palette');
      expect(commandPaletteCmd).toBeDefined();

      const storageCmd = getCommandById('toggle-storage-inspector');
      expect(storageCmd).toBeDefined();

      const smartCmd = getCommandById('toggle-smart-suggestions');
      expect(smartCmd).toBeDefined();
    });
  });

  describe('Command Structure', () => {
    it('should have valid command structure', () => {
      const commands = getAllCommands();
      
      commands.forEach(cmd => {
        expect(cmd).toHaveProperty('id');
        expect(cmd).toHaveProperty('title');
        expect(cmd).toHaveProperty('category');
        expect(cmd).toHaveProperty('keywords');
        expect(cmd).toHaveProperty('execute');
        expect(typeof cmd.execute).toBe('function');
        expect(Array.isArray(cmd.keywords)).toBe(true);
      });
    });

    it('should have unique IDs', () => {
      const commands = getAllCommands();
      const ids = commands.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
