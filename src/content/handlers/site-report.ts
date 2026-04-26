import { siteReportGenerator } from '../site-report-generator';
import { createToolHandlers } from './shared';

export const siteReportHandlers = {
  ...createToolHandlers('SITE_REPORT', siteReportGenerator, 'isSiteReportActive'),
  SITE_REPORT_GENERATE: (payload, _state, sendResponse) => {
    siteReportGenerator
      .generateReport(payload || {})
      .then((report) => sendResponse({ success: true, report }))
      .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    return true; // Async
  },
};
