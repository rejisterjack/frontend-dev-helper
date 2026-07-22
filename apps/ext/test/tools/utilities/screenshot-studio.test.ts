import { describe, beforeEach, vi, it, expect } from 'vitest';
import { screenshotStudio } from '@/tools/utilities/screenshot-studio';
import { runStandardToolTests } from '../../helpers';

describe('screenshotStudio', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(screenshotStudio, {
    id: 'screenshot-studio',
    name: 'Screenshot Studio',
    category: 'utility',
    icon: 'Camera',
  }, {
    captureMode: 'viewport',
    format: 'png',
    quality: 90,
    includeBackground: true,
  });

  it('should have capture mode select', () => {
    const schema = screenshotStudio.configSchema;
    expect(schema.captureMode).toBeDefined();
    expect(schema.captureMode.type).toBe('select');
  });
});
