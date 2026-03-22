/**
 * Form Debugger Constants
 *
 * Constants and configuration for the form debugger module.
 */

/** CSS prefix for all form debugger elements */
export const PREFIX = 'fdh-form-debugger';

/** Auto-refresh interval in milliseconds */
export const REFRESH_INTERVAL = 3000;

// Input types that support autofill
export const AUTOFILL_FIELDS = [
  'name',
  'given-name',
  'family-name',
  'email',
  'tel',
  'street-address',
  'address-line1',
  'address-line2',
  'address-level1',
  'address-level2',
  'postal-code',
  'country',
  'organization',
  'organization-title',
  'bday',
  'bday-day',
  'bday-month',
  'bday-year',
  'sex',
  'url',
  'photo',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
  'cc-name',
  'cc-number',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-csc',
  'cc-type',
  'transaction-currency',
  'transaction-amount',
];

/** CSS styles for the debugger panel */
export function getStyles(): string {
  return `
    #${PREFIX}-panel {
      background: #0f172a;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #e2e8f0;
    }

    #${PREFIX}-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    #${PREFIX}-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
    }

    #${PREFIX}-actions {
      display: flex;
      gap: 4px;
    }

    #${PREFIX}-actions button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 14px;
    }

    #${PREFIX}-actions button:hover {
      background: #334155;
      color: #f8fafc;
    }

    #${PREFIX}-actions button.active {
      background: #4f46e5;
      color: white;
    }

    #${PREFIX}-tabs {
      display: flex;
      overflow-x: auto;
      border-bottom: 1px solid #334155;
      background: #1e293b;
    }

    .${PREFIX}-tab {
      flex: 1;
      min-width: 80px;
      padding: 10px 8px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 12px;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .${PREFIX}-tab:hover {
      color: #e2e8f0;
      background: #334155;
    }

    .${PREFIX}-tab.active {
      color: #f8fafc;
      background: #0f172a;
      border-bottom: 2px solid #4f46e5;
    }

    .${PREFIX}-badge {
      background: #334155;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      min-width: 16px;
      text-align: center;
    }

    #${PREFIX}-toolbar {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #334155;
    }

    #${PREFIX}-search {
      flex: 1;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 13px;
    }

    #${PREFIX}-search:focus {
      outline: none;
      border-color: #4f46e5;
    }

    #${PREFIX}-search::placeholder {
      color: #64748b;
    }

    #${PREFIX}-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      min-height: 200px;
    }

    .${PREFIX}-loading,
    .${PREFIX}-empty {
      text-align: center;
      padding: 40px;
      color: #64748b;
    }

    .${PREFIX}-empty-hint {
      font-size: 12px;
      margin-top: 8px;
      opacity: 0.7;
    }

    .${PREFIX}-info {
      padding: 8px 12px;
      background: #1e293b;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      color: #94a3b8;
    }

    .${PREFIX}-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Form Cards */
    .${PREFIX}-form-card {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
      cursor: pointer;
    }

    .${PREFIX}-form-card:hover {
      border-color: #4f46e5;
    }

    .${PREFIX}-form-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .${PREFIX}-form-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .${PREFIX}-form-method {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
    }

    .${PREFIX}-form-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    .${PREFIX}-form-errors {
      margin-top: 8px;
      padding: 6px 10px;
      background: rgba(220, 38, 38, 0.2);
      border-radius: 4px;
      font-size: 11px;
      color: #f87171;
    }

    /* Field Cards */
    .${PREFIX}-field {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #334155;
    }

    .${PREFIX}-field-error {
      border-color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .${PREFIX}-field-unlabeled {
      border-left: 3px solid #f59e0b;
    }

    .${PREFIX}-field-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .${PREFIX}-field-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .${PREFIX}-field-type {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      text-transform: uppercase;
    }

    .${PREFIX}-field-label {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .${PREFIX}-field-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .${PREFIX}-field-selector {
      font-family: monospace;
      font-size: 11px;
      color: #64748b;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .${PREFIX}-field-value {
      margin-top: 6px;
      padding: 6px 10px;
      background: #0f172a;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      color: #94a3b8;
    }

    /* Badges */
    .${PREFIX}-badge-required {
      background: #dc2626;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .${PREFIX}-badge-autofill {
      background: #059669;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .${PREFIX}-badge-warning {
      background: #f59e0b;
      color: #1e293b;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    /* Validation */
    .${PREFIX}-validation-item {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #dc2626;
    }

    .${PREFIX}-validation-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .${PREFIX}-validation-name {
      font-weight: 600;
      color: #f8fafc;
    }

    .${PREFIX}-validation-type {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
    }

    .${PREFIX}-validation-message {
      color: #f87171;
      font-size: 12px;
      margin-top: 4px;
    }

    .${PREFIX}-validation-constraints {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }

    .${PREFIX}-validation-constraints span {
      background: #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      color: #94a3b8;
    }

    /* Accessibility */
    .${PREFIX}-a11y-issue {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #f59e0b;
    }

    .${PREFIX}-a11y-form {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .${PREFIX}-a11y-message {
      color: #fbbf24;
      font-size: 13px;
    }

    /* Footer */
    #${PREFIX}-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      border-top: 1px solid #334155;
      background: #1e293b;
      font-size: 11px;
      color: #64748b;
    }

    /* Scrollbar */
    #${PREFIX}-content::-webkit-scrollbar {
      width: 8px;
    }

    #${PREFIX}-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }

    #${PREFIX}-content::-webkit-scrollbar-thumb:hover {
      background: #475569;
    }
  `;
}
