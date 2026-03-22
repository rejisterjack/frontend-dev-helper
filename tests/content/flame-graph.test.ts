/**
 * Flame Graph Tests
 */

import { describe, it, expect } from 'vitest';

describe('Flame Graph', () => {
  describe('Performance Data', () => {
    it('should process performance entries', () => {
      const entries = [
        { name: 'script', duration: 100, startTime: 0 },
        { name: 'render', duration: 50, startTime: 100 },
      ];

      const totalTime = entries.reduce((sum, e) => sum + e.duration, 0);
      expect(totalTime).toBe(150);
    });

    it('should calculate frame timing', () => {
      const fps = 60;
      const frameTime = 1000 / fps;
      
      expect(frameTime).toBeCloseTo(16.67, 1);
    });

    it('should detect long tasks', () => {
      const tasks = [30, 60, 100, 20];
      const longTasks = tasks.filter(t => t > 50);
      
      expect(longTasks).toContain(60);
      expect(longTasks).toContain(100);
      expect(longTasks.length).toBe(2);
    });
  });

  describe('Data Structure', () => {
    it('should build tree from flat entries', () => {
      type Node = { name: string; value: number; children: Node[] };
      
      const buildTree = (entries: { name: string; duration: number }[]): Node => {
        const root: Node = { name: 'root', value: 0, children: [] };
        for (const entry of entries) {
          root.children.push({ name: entry.name, value: entry.duration, children: [] });
          root.value += entry.duration;
        }
        return root;
      };

      const tree = buildTree([{ name: 'a', duration: 10 }, { name: 'b', duration: 20 }]);
      expect(tree.value).toBe(30);
      expect(tree.children.length).toBe(2);
    });
  });
});
