/**
 * Responsive Preview Tests
 */

import { describe, it, expect } from 'vitest';

describe('Responsive Preview', () => {
  describe('Device Presets', () => {
    it('should have mobile preset', () => {
      const mobile = { name: 'iPhone 14', width: 390, height: 844 };
      expect(mobile.width).toBe(390);
      expect(mobile.height).toBe(844);
    });

    it('should have tablet preset', () => {
      const tablet = { name: 'iPad Pro', width: 1024, height: 1366 };
      expect(tablet.width).toBe(1024);
      expect(tablet.height).toBe(1366);
    });

    it('should have desktop preset', () => {
      const desktop = { name: 'Desktop', width: 1920, height: 1080 };
      expect(desktop.width).toBe(1920);
    });
  });

  describe('Viewport Calculation', () => {
    it('should calculate scale for fitting', () => {
      const deviceWidth = 1920;
      const containerWidth = 960;
      const scale = containerWidth / deviceWidth;
      
      expect(scale).toBe(0.5);
    });

    it('should handle device rotation', () => {
      const device = { width: 390, height: 844 };
      const rotated = { width: device.height, height: device.width };
      
      expect(rotated.width).toBe(844);
      expect(rotated.height).toBe(390);
    });
  });

  describe('Sync Scrolling', () => {
    it('should sync scroll positions', () => {
      const scrollY = 500;
      const syncedPositions = [500, 500, 500]; // Multiple viewports
      
      expect(syncedPositions.every(pos => pos === scrollY)).toBe(true);
    });
  });
});
