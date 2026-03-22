/**
 * Tool Lifecycle Integration Tests
 */

import { describe, it, expect, vi } from 'vitest';

describe('Tool Lifecycle Integration', () => {
  type ToolState = 'disabled' | 'enabling' | 'enabled' | 'disabling' | 'error';

  interface Tool {
    id: string;
    state: ToolState;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
  }

  const createMockTool = (id: string): Tool => ({
    id,
    state: 'disabled',
    enable: vi.fn(async function (this: Tool) {
      this.state = 'enabling';
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.state = 'enabled';
    }),
    disable: vi.fn(async function (this: Tool) {
      this.state = 'disabling';
      await new Promise((resolve) => setTimeout(resolve, 10));
      this.state = 'disabled';
    }),
  });

  describe('Enable Flow', () => {
    it('should transition through states when enabling', async () => {
      const tool = createMockTool('pesticide');

      expect(tool.state).toBe('disabled');

      const enablePromise = tool.enable();
      expect(tool.state).toBe('enabling');

      await enablePromise;
      expect(tool.state).toBe('enabled');
    });

    it('should enable multiple tools in sequence', async () => {
      const tool1 = createMockTool('pesticide');
      const tool2 = createMockTool('colorPicker');

      await tool1.enable();
      await tool2.enable();

      expect(tool1.state).toBe('enabled');
      expect(tool2.state).toBe('enabled');
    });
  });

  describe('Disable Flow', () => {
    it('should transition through states when disabling', async () => {
      const tool = createMockTool('pesticide');
      await tool.enable();

      const disablePromise = tool.disable();
      expect(tool.state).toBe('disabling');

      await disablePromise;
      expect(tool.state).toBe('disabled');
    });
  });

  describe('Toggle Flow', () => {
    it('should toggle from disabled to enabled', async () => {
      const tool = createMockTool('pesticide');

      const toggle = async () => {
        if (tool.state === 'disabled') {
          await tool.enable();
        } else {
          await tool.disable();
        }
      };

      await toggle();
      expect(tool.state).toBe('enabled');

      await toggle();
      expect(tool.state).toBe('disabled');
    });
  });

  describe('Error Handling', () => {
    it('should handle enable failure', async () => {
      const tool: Tool = {
        id: 'failing',
        state: 'disabled',
        enable: vi.fn(async function (this: Tool) {
          this.state = 'error';
          throw new Error('Enable failed');
        }),
        disable: vi.fn(),
      };

      try {
        await tool.enable();
      } catch (e) {
        expect(tool.state).toBe('error');
      }
    });
  });
});
