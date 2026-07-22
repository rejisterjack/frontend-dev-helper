import { describe, beforeEach, vi, it, expect } from 'vitest';
import { siteReportGenerator } from '@/tools/utilities/site-report-generator';
import { runStandardToolTests } from '../../helpers';

describe('siteReportGenerator', () => {
  beforeEach(() => {
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  runStandardToolTests(siteReportGenerator, {
    id: 'site-report-generator',
    name: 'Site Report Generator',
    category: 'utility',
    icon: 'FileBarChart',
  }, {
    includePerformance: true,
    includeAccessibility: true,
    includeSEO: true,
    includeBestPractices: true,
    format: 'html',
  });

  it('should have report section toggles', () => {
    const schema = siteReportGenerator.configSchema;
    expect(schema.includePerformance).toBeDefined();
    expect(schema.includeAccessibility).toBeDefined();
    expect(schema.includeSEO).toBeDefined();
    expect(schema.includeBestPractices).toBeDefined();
  });
});
