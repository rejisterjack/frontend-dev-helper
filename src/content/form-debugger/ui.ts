/**
 * Form Debugger UI
 *
 * UI component creation and rendering for the form debugger panel.
 */

import type { FormInfo } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { getStyles, PREFIX } from './constants';
/**
 * Create the panel HTML structure
 */
export function getPanelHTML(highlightIssuesEnabled: boolean): string {
  return `
    <div id="${PREFIX}-header">
      <div id="${PREFIX}-title">
        <span>📝</span>
        <span>Form Debugger</span>
      </div>
      <div id="${PREFIX}-actions">
        <button id="${PREFIX}-refresh" title="Refresh">🔄</button>
        <button id="${PREFIX}-toggle-highlights" title="Toggle Highlights" class="${highlightIssuesEnabled ? 'active' : ''}">🔍</button>
        <button id="${PREFIX}-close" title="Close">✕</button>
      </div>
    </div>
    
    <div id="${PREFIX}-tabs">
      <button class="${PREFIX}-tab active" data-tab="overview">
        Overview
        <span class="${PREFIX}-badge" id="${PREFIX}-forms-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="fields">
        Fields
        <span class="${PREFIX}-badge" id="${PREFIX}-fields-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="validation">
        Validation
        <span class="${PREFIX}-badge" id="${PREFIX}-validation-count">0</span>
      </button>
      <button class="${PREFIX}-tab" data-tab="accessibility">
        A11y
        <span class="${PREFIX}-badge" id="${PREFIX}-a11y-count">0</span>
      </button>
    </div>
    
    <div id="${PREFIX}-toolbar">
      <input type="text" id="${PREFIX}-search" placeholder="Search fields..." />
    </div>
    
    <div id="${PREFIX}-content"></div>
    
    <div id="${PREFIX}-footer">
      <span id="${PREFIX}-stats"></span>
      <span id="${PREFIX}-status">Ready</span>
    </div>
  `;
}

/**
 * Render the overview tab
 */
export function renderOverview(forms: FormInfo[]): string {
  if (forms.length === 0) {
    return `
      <div class="${PREFIX}-empty">
        <div>No forms found</div>
        <div class="${PREFIX}-empty-hint">This page doesn't contain any form elements</div>
      </div>
    `;
  }

  const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
  const totalIssues = forms.reduce((sum, f) => sum + f.accessibilityIssues.length, 0);

  return `
    <div class="${PREFIX}-info">
      <div>${forms.length} form${forms.length !== 1 ? 's' : ''} • ${totalFields} field${totalFields !== 1 ? 's' : ''}</div>
      ${totalIssues > 0 ? `<div style="color: #f87171; margin-top: 4px;">⚠️ ${totalIssues} accessibility issue${totalIssues !== 1 ? 's' : ''}</div>` : ''}
    </div>
    <div class="${PREFIX}-list">
      ${forms
        .map(
          (form, index) => `
        <div class="${PREFIX}-form-card" data-index="${index}">
          <div class="${PREFIX}-form-header">
            <span class="${PREFIX}-form-name">${escapeHtml(form.name || 'Unnamed Form')}</span>
            <span class="${PREFIX}-form-method">${form.method.toUpperCase()}</span>
          </div>
          <div class="${PREFIX}-form-meta">
            <span>${form.fields.length} fields</span>
            <span>${form.fields.filter((f) => f.isRequired).length} required</span>
            ${form.autofillEnabled ? `<span class="${PREFIX}-badge-autofill">Autofill</span>` : ''}
            ${form.accessibilityIssues.length > 0 ? `<span class="${PREFIX}-badge-warning">${form.accessibilityIssues.length} issues</span>` : ''}
          </div>
          ${
            form.fields.some((f) => f.hasError)
              ? `
            <div class="${PREFIX}-form-errors">
              ${form.fields.filter((f) => f.hasError).length} validation errors
            </div>
          `
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render the fields tab
 */
export function renderFields(forms: FormInfo[], selectedForm: FormInfo | null): string {
  const targetForm = selectedForm || forms[0];

  if (!targetForm || targetForm.fields.length === 0) {
    return `<div class="${PREFIX}-empty">No fields to display</div>`;
  }

  return `
    <div class="${PREFIX}-info">${targetForm.fields.length} fields in "${escapeHtml(targetForm.name || 'Form')}"</div>
    <div class="${PREFIX}-list">
      ${targetForm.fields
        .map(
          (field) => `
        <div class="${PREFIX}-field ${field.hasError ? `${PREFIX}-field-error` : ''} ${!field.hasLabel ? `${PREFIX}-field-unlabeled` : ''}">
          <div class="${PREFIX}-field-header">
            <span class="${PREFIX}-field-name">${escapeHtml(field.name || 'unnamed')}</span>
            <span class="${PREFIX}-field-type">${field.type}</span>
            ${field.isRequired ? `<span class="${PREFIX}-badge-required">Required</span>` : ''}
            ${field.autofill ? `<span class="${PREFIX}-badge-autofill" title="${field.autofill}">🔄</span>` : ''}
          </div>
          ${field.labelText ? `<div class="${PREFIX}-field-label">${escapeHtml(field.labelText)}</div>` : ''}
          <div class="${PREFIX}-field-meta">
            <span class="${PREFIX}-field-selector">${escapeHtml(field.selector)}</span>
            ${!field.hasLabel ? `<span class="${PREFIX}-badge-warning">No Label</span>` : ''}
          </div>
          ${field.value ? `<div class="${PREFIX}-field-value">Value: ${escapeHtml(truncate(field.value, 30))}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render the validation tab
 */
export function renderValidation(forms: FormInfo[], selectedForm: FormInfo | null): string {
  const targetForm = selectedForm || forms[0];

  if (!targetForm) {
    return `<div class="${PREFIX}-empty">No form selected</div>`;
  }

  const invalidFields = targetForm.fields.filter((f) => !f.isValid || f.hasError);

  return `
    <div class="${PREFIX}-info">
      ${invalidFields.length} validation issue${invalidFields.length !== 1 ? 's' : ''} • ${targetForm.fields.filter((f) => f.isRequired).length} required fields
    </div>
    ${
      invalidFields.length === 0
        ? `
      <div class="${PREFIX}-empty">
        <div>✅ All fields valid</div>
      </div>
    `
        : `
      <div class="${PREFIX}-list">
        ${invalidFields
          .map(
            (field) => `
          <div class="${PREFIX}-validation-item">
            <div class="${PREFIX}-validation-header">
              <span class="${PREFIX}-validation-name">${escapeHtml(field.name || 'unnamed')}</span>
              <span class="${PREFIX}-validation-type">${field.type}</span>
            </div>
            <div class="${PREFIX}-validation-message">
              ❌ ${field.validationMessage || 'Validation failed'}
            </div>
            <div class="${PREFIX}-validation-constraints">
              ${field.isRequired ? '<span>Required</span>' : ''}
              ${(field.element as HTMLInputElement).pattern ? `<span>Pattern: ${(field.element as HTMLInputElement).pattern}</span>` : ''}
              ${(field.element as HTMLInputElement).minLength ? `<span>Min: ${(field.element as HTMLInputElement).minLength}</span>` : ''}
              ${(field.element as HTMLInputElement).maxLength ? `<span>Max: ${(field.element as HTMLInputElement).maxLength}</span>` : ''}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    }
  `;
}

/**
 * Render the accessibility tab
 */
export function renderAccessibility(forms: FormInfo[]): string {
  const allIssues: Array<{ form: string; issue: string }> = [];

  forms.forEach((form) => {
    form.accessibilityIssues.forEach((issue) => {
      allIssues.push({ form: form.name || 'Unnamed', issue });
    });
  });

  // Add field-level issues
  forms.forEach((form) => {
    form.fields.forEach((field) => {
      if (!field.hasLabel) {
        allIssues.push({
          form: form.name || 'Unnamed',
          issue: `Field "${field.name || field.type}" lacks accessible label`,
        });
      }
    });
  });

  if (allIssues.length === 0) {
    return `
      <div class="${PREFIX}-empty">
        <div>✅ No accessibility issues found</div>
        <div class="${PREFIX}-empty-hint">Great job on form accessibility!</div>
      </div>
    `;
  }

  return `
    <div class="${PREFIX}-info">${allIssues.length} accessibility issue${allIssues.length !== 1 ? 's' : ''} found</div>
    <div class="${PREFIX}-list">
      ${allIssues
        .map(
          ({ form, issue }) => `
        <div class="${PREFIX}-a11y-issue">
          <div class="${PREFIX}-a11y-form">${escapeHtml(form)}</div>
          <div class="${PREFIX}-a11y-message">⚠️ ${escapeHtml(issue)}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Truncate a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
}

// Re-export getStyles for convenience
export { getStyles };
