import * as performanceBudget from '../performance-budget';
import { createToolHandlers } from './shared';

export const performanceBudgetHandlers = {
  ...createToolHandlers('PERFORMANCE_BUDGET', performanceBudget, 'isPerformanceBudgetActive'),
  PERFORMANCE_BUDGET_CHECK: (_payload, _state, sendResponse) => {
    const metrics = performanceBudget.collectMetrics();
    const violations = performanceBudget.checkBudgets();
    sendResponse({ success: true, metrics, violations });
  },
  PERFORMANCE_BUDGET_SET_BUDGET: (payload, _state, sendResponse) => {
    const { metric, value } = payload as { metric: string; value: number };
    performanceBudget.setBudget(metric, value);
    sendResponse({ success: true });
  },
};
