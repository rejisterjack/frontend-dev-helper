import * as responsiveTesting from '../responsive-testing';

export const responsiveTestingHandlers = {
  RESPONSIVE_TESTING_RUN: (payload, _state, sendResponse) => {
    const { breakpoints } = payload as { breakpoints?: responsiveTesting.Breakpoint[] };
    responsiveTesting.runResponsiveTesting(breakpoints).then((report) => {
      sendResponse({ success: true, report });
    });
    return true;
  },
  RESPONSIVE_TESTING_GET_REPORTS: (_payload, _state, sendResponse) => {
    responsiveTesting.getReports().then((reports) => {
      sendResponse({ success: true, reports });
    });
    return true;
  },
  RESPONSIVE_TESTING_GET_REPORT: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    responsiveTesting.getReport(id).then((report) => {
      sendResponse({ success: true, report });
    });
    return true;
  },
  RESPONSIVE_TESTING_DELETE: (payload, _state, sendResponse) => {
    const { id } = payload as { id: string };
    responsiveTesting.deleteReport(id).then(() => {
      sendResponse({ success: true });
    });
    return true;
  },
  RESPONSIVE_TESTING_EXPORT_HTML: (payload, _state, sendResponse) => {
    const { report } = payload as { report: responsiveTesting.ResponsiveReport };
    const html = responsiveTesting.generateHTMLReport(report);
    sendResponse({ success: true, html });
  },
};
