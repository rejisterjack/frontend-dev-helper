/** Export manager handler — uses dynamic import to avoid circular dependencies. */

export const exportManagerHandlers = {
  EXPORT_GENERATE_REPORT: (payload, _state, sendResponse) => {
    // Dynamic import to avoid circular dependencies
    import('../export-manager').then(({ exportManager }) => {
      exportManager
        .generateReport(
          (payload as { elements?: boolean; performance?: boolean; screenshot?: boolean }) || {},
        )
        .then((report) => sendResponse({ success: true, report }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
    });
    return true; // Async
  },
};
