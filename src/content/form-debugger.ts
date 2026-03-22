/**
 * Form Debugger Module
 *
 * Comprehensive form debugging and analysis tool that provides:
 * - Analyze all forms on page
 * - Show form fields with validation status
 * - Detect missing labels
 * - Show autofill detection
 * - Display validation messages
 * - Check accessibility issues in forms
 */

import type { FormDebuggerState, FormField, FormInfo } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Constants
// ============================================

const PREFIX = 'fdh-form-debugger';
const REFRESH_INTERVAL = 3000;

// Input types that support autofill
const AUTOFILL_FIELDS = [
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

// ============================================
// State
// ============================================

let isEnabled = false;
let panelContainer: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let refreshTimer: number | null = null;
let mutationObserver: MutationObserver | null = null;
let forms: FormInfo[] = [];
let selectedForm: FormInfo | null = null;
let highlightIssuesEnabled = true;
let validationOverlays: HTMLElement | null = null;
let currentTab: 'overview' | 'fields' | 'validation' | 'accessibility' = 'overview';

// ============================================
// Public API
// ============================================

/**
 * Enable the form debugger
 */
export function enable(): void {
  if (isEnabled) return;
  isEnabled = true;

  createPanel();
  startAutoRefresh();
  startMutationObserver();
  attachEventListeners();
  analyzeForms();
  updateValidationOverlays();

  logger.log('[FormDebugger] Enabled');
}

/**
 * Disable the form debugger
 */
export function disable(): void {
  if (!isEnabled) return;
  isEnabled = false;

  destroyPanel();
  removeValidationOverlays();
  stopAutoRefresh();
  stopMutationObserver();
  detachEventListeners();

  forms = [];
  selectedForm = null;

  logger.log('[FormDebugger] Disabled');
}

/**
 * Toggle the form debugger
 */
export function toggle(): void {
  if (isEnabled) {
    disable();
  } else {
    enable();
  }
}

/**
 * Get current state
 */
export function getState(): FormDebuggerState {
  return {
    enabled: isEnabled,
    forms,
    selectedForm,
    highlightIssues: highlightIssuesEnabled,
  };
}

/**
 * Refresh form data
 */
export function refresh(): void {
  if (!isEnabled) return;
  analyzeForms();
  updateValidationOverlays();
  renderCurrentTab();
}

/**
 * Set whether to highlight issues
 */
export function setHighlightIssues(enabled: boolean): void {
  highlightIssuesEnabled = enabled;
  if (isEnabled) {
    updateValidationOverlays();
    renderCurrentTab();
  }
}

/**
 * Select a specific form for detailed view
 */
export function selectForm(formIndex: number): void {
  selectedForm = forms[formIndex] || null;
  if (selectedForm) {
    currentTab = 'fields';
  }
  renderCurrentTab();
}

// ============================================
// Form Analysis
// ============================================

function analyzeForms(): void {
  const formElements = Array.from(document.querySelectorAll('form'));
  
  forms = formElements.map((form, index) => analyzeForm(form, index));

  // Also find form-like structures (inputs not in forms)
  const orphanedInputs = Array.from(document.querySelectorAll('input:not(form input), select:not(form select), textarea:not(form textarea)'));
  if (orphanedInputs.length > 0) {
    forms.push(createOrphanedForm(orphanedInputs));
  }

  // Validate selected form still exists
  if (selectedForm && !forms.find(f => f.element === selectedForm?.element)) {
    selectedForm = null;
  }
}

function analyzeForm(form: HTMLFormElement, index: number): FormInfo {
  const fields = analyzeFormFields(form);
  const accessibilityIssues = checkAccessibilityIssues(form, fields);

  return {
    element: form,
    selector: generateSelector(form),
    name: form.name || form.id || `Form ${index + 1}`,
    action: form.action || window.location.href,
    method: form.method || 'GET',
    fields,
    isValid: fields.every(f => f.isValid),
    hasSubmitHandler: hasSubmitHandler(form),
    autofillEnabled: fields.some(f => f.autofill),
    accessibilityIssues,
  };
}

function analyzeFormFields(form: HTMLFormElement): FormField[] {
  const fieldSelectors = 'input, select, textarea, button';
  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(fieldSelectors));

  return fields.map((field) => {
    const isValid = (field as HTMLInputElement).checkValidity?.() ?? true;
    const validationMessage = (field as HTMLInputElement).validationMessage || '';
    const labelInfo = getLabelInfo(field);
    const autofill = detectAutofill(field);

    return {
      element: field,
      selector: generateSelector(field),
      name: field.name || '',
      type: (field as HTMLInputElement).type || field.tagName.toLowerCase(),
      value: field.value,
      isValid,
      validationMessage,
      isRequired: field.required,
      hasLabel: labelInfo.hasLabel,
      labelText: labelInfo.text,
      hasError: !isValid || validationMessage !== '',
      autofill,
    };
  });
}

function createOrphanedForm(inputs: Element[]): FormInfo {
  const fields: FormField[] = inputs.map((el) => {
    const field = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const isValid = field.checkValidity?.() ?? true;
    const validationMessage = (field as HTMLInputElement).validationMessage || '';
    const labelInfo = getLabelInfo(field);
    const autofill = detectAutofill(field);

    return {
      element: field,
      selector: generateSelector(field),
      name: field.name || '',
      type: (field as HTMLInputElement).type || field.tagName.toLowerCase(),
      value: field.value || '',
      isValid,
      validationMessage,
      isRequired: field.required,
      hasLabel: labelInfo.hasLabel,
      labelText: labelInfo.text,
      hasError: !isValid || validationMessage !== '',
      autofill,
    };
  });

  const accessibilityIssues = checkOrphanedAccessibilityIssues(inputs);

  return {
    element: document.body as unknown as HTMLFormElement,
    selector: 'body',
    name: 'Orphaned Fields (No Form)',
    action: '',
    method: '',
    fields,
    isValid: fields.every(f => f.isValid),
    hasSubmitHandler: false,
    autofillEnabled: fields.some(f => f.autofill),
    accessibilityIssues,
  };
}

function getLabelInfo(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): { hasLabel: boolean; text?: string } {
  // Check for explicit label
  if (field.id) {
    const explicitLabel = document.querySelector(`label[for="${field.id}"]`);
    if (explicitLabel) {
      return { hasLabel: true, text: explicitLabel.textContent || undefined };
    }
  }

  // Check for implicit label (field inside label)
  const parentLabel = field.closest('label');
  if (parentLabel) {
    return { hasLabel: true, text: parentLabel.textContent || undefined };
  }

  // Check for aria-label
  const ariaLabel = field.getAttribute('aria-label');
  if (ariaLabel) {
    return { hasLabel: true, text: ariaLabel };
  }

  // Check for aria-labelledby
  const ariaLabelledBy = field.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) {
      return { hasLabel: true, text: labelElement.textContent || undefined };
    }
  }

  // Check for title attribute
  const title = field.getAttribute('title');
  if (title) {
    return { hasLabel: true, text: title };
  }

  // Check for placeholder (weak label)
  const placeholder = field.getAttribute('placeholder');
  if (placeholder) {
    return { hasLabel: true, text: placeholder };
  }

  return { hasLabel: false };
}

function detectAutofill(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | undefined {
  const autocomplete = field.getAttribute('autocomplete');
  if (autocomplete && AUTOFILL_FIELDS.includes(autocomplete)) {
    return autocomplete;
  }

  // Try to infer from field name/type
  const name = field.name.toLowerCase();
  const type = (field as HTMLInputElement).type?.toLowerCase() || '';

  if (type === 'email' || name.includes('email')) return 'email';
  if (type === 'tel' || name.includes('phone') || name.includes('tel')) return 'tel';
  if (name.includes('first') && name.includes('name')) return 'given-name';
  if (name.includes('last') && name.includes('name')) return 'family-name';
  if (name.includes('name')) return 'name';
  if (type === 'password' || name.includes('password')) return 'current-password';
  if (name.includes('address')) return 'street-address';
  if (name.includes('city')) return 'address-level2';
  if (name.includes('state') || name.includes('province')) return 'address-level1';
  if (name.includes('zip') || name.includes('postal')) return 'postal-code';
  if (name.includes('country')) return 'country';

  return undefined;
}

function hasSubmitHandler(form: HTMLFormElement): boolean {
  // Check for onsubmit attribute
  if (form.hasAttribute('onsubmit')) return true;

  // Check for submit button
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) return true;

  // Note: Event listeners can't be directly detected
  return false;
}

function checkAccessibilityIssues(form: HTMLFormElement, fields: FormField[]): string[] {
  const issues: string[] = [];

  // Check for missing form label
  if (!form.getAttribute('aria-label') && !form.getAttribute('aria-labelledby') && !form.id) {
    issues.push('Form lacks accessible name');
  }

  // Check for fields without labels
  const unlabeledFields = fields.filter(f => !f.hasLabel);
  if (unlabeledFields.length > 0) {
    issues.push(`${unlabeledFields.length} fields without proper labels`);
  }

  // Check for required fields without required attribute
  const requiredByName = fields.filter(f => 
    !f.isRequired && 
    (f.name.includes('required') || f.element.className.includes('required'))
  );
  if (requiredByName.length > 0) {
    issues.push(`${requiredByName.length} fields appear required but lack required attribute`);
  }

  // Check for missing error message containers
  const fieldsWithErrors = fields.filter(f => f.isRequired && !f.isValid);
  if (fieldsWithErrors.length > 0 && !form.querySelector('[role="alert"], .error, [aria-live]')) {
    issues.push('Form may lack error message announcement for screen readers');
  }

  return issues;
}

function checkOrphanedAccessibilityIssues(inputs: Element[]): string[] {
  const issues: string[] = [];
  issues.push('Fields exist outside of a form element');
  
  const unlabeledCount = inputs.filter(input => {
    const field = input as HTMLInputElement;
    return !field.id || !document.querySelector(`label[for="${field.id}"]`);
  }).length;

  if (unlabeledCount > 0) {
    issues.push(`${unlabeledCount} orphaned fields without labels`);
  }

  return issues;
}

function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const tagName = element.tagName.toLowerCase();
  const classes = Array.from(element.classList)
    .filter((c) => !c.startsWith('fdh-'))
    .join('.');

  if (classes) {
    return `${tagName}.${classes}`;
  }

  if ((element as HTMLInputElement).name) {
    return `${tagName}[name="${(element as HTMLInputElement).name}"]`;
  }

  // Generate path with index
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    const parentEl: HTMLElement | null = current.parentElement;

    if (parentEl) {
      const siblings = Array.from(parentEl.children).filter(
        (child): child is HTMLElement => (child as HTMLElement).tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parentEl;
  }

  return path.join(' > ');
}

// ============================================
// Event Handlers
// ============================================

function attachEventListeners(): void {
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);
  document.addEventListener('invalid', handleInvalid, true,);
  document.addEventListener('submit', handleSubmit, true);
}

function detachEventListeners(): void {
  document.removeEventListener('input', handleInput, true);
  document.removeEventListener('change', handleChange, true);
  document.removeEventListener('invalid', handleInvalid, true);
  document.removeEventListener('submit', handleSubmit, true);
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  // Update field validity in real-time
  updateFieldValidity(target);
}

function handleChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  updateFieldValidity(target);
  refresh();
}

function handleInvalid(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (!target || !isFormField(target)) return;

  logger.warn('[FormDebugger] Field validation failed:', target.name, target.validationMessage);
}

function handleSubmit(event: SubmitEvent): void {
  const form = event.target as HTMLFormElement;
  if (!form) return;

  // Refresh to show validation state
  setTimeout(refresh, 0);
}

function isFormField(element: HTMLElement): boolean {
  return element instanceof HTMLInputElement ||
         element instanceof HTMLTextAreaElement ||
         element instanceof HTMLSelectElement;
}

function updateFieldValidity(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
  const formInfo = forms.find(f => f.element.contains(field));
  if (!formInfo) return;

  const fieldInfo = formInfo.fields.find(f => f.element === field);
  if (fieldInfo) {
    fieldInfo.isValid = (field as HTMLInputElement).checkValidity?.() ?? true;
    fieldInfo.validationMessage = (field as HTMLInputElement).validationMessage || '';
    fieldInfo.hasError = !fieldInfo.isValid || fieldInfo.validationMessage !== '';
    fieldInfo.value = field.value;
  }
}

// ============================================
// UI Panel
// ============================================

function createPanel(): void {
  if (panelContainer) return;

  panelContainer = document.createElement('div');
  panelContainer.id = `${PREFIX}-container`;
  panelContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 550px;
    max-height: 80vh;
    z-index: 2147483646;
  `;

  shadowRoot = panelContainer.attachShadow({ mode: 'open' });

  const styleSheet = document.createElement('style');
  styleSheet.textContent = getStyles();
  shadowRoot.appendChild(styleSheet);

  const panel = document.createElement('div');
  panel.id = `${PREFIX}-panel`;
  panel.innerHTML = getPanelHTML();
  shadowRoot.appendChild(panel);

  setupEventListeners(panel);

  document.body.appendChild(panelContainer);

  renderCurrentTab();
}

function destroyPanel(): void {
  if (!panelContainer) return;
  panelContainer.remove();
  panelContainer = null;
  shadowRoot = null;
}

function getPanelHTML(): string {
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

function setupEventListeners(panel: HTMLElement): void {
  panel.querySelector(`#${PREFIX}-close`)?.addEventListener('click', () => disable());

  panel.querySelector(`#${PREFIX}-refresh`)?.addEventListener('click', () => {
    refresh();
    updateStatus('Refreshed');
  });

  panel.querySelector(`#${PREFIX}-toggle-highlights`)?.addEventListener('click', () => {
    setHighlightIssues(!highlightIssuesEnabled);
    updateStatus(highlightIssuesEnabled ? 'Highlights on' : 'Highlights off');
  });

  panel.querySelectorAll(`.${PREFIX}-tab`).forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab') as typeof currentTab;
      switchTab(tabName);
    });
  });

  const searchInput = panel.querySelector(`#${PREFIX}-search`) as HTMLInputElement;
  searchInput?.addEventListener('input', (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    filterContent(query);
  });
}

function switchTab(tab: typeof currentTab): void {
  currentTab = tab;

  shadowRoot?.querySelectorAll(`.${PREFIX}-tab`).forEach((t) => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tab);
  });

  renderCurrentTab();
}

function renderCurrentTab(): void {
  if (!shadowRoot) return;

  const content = shadowRoot.querySelector(`#${PREFIX}-content`);
  if (!content) return;

  switch (currentTab) {
    case 'overview':
      content.innerHTML = renderOverview();
      break;
    case 'fields':
      content.innerHTML = renderFields();
      break;
    case 'validation':
      content.innerHTML = renderValidation();
      break;
    case 'accessibility':
      content.innerHTML = renderAccessibility();
      break;
  }

  updateStats();
  updateBadges();
}

function renderOverview(): string {
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
            <span>${form.fields.filter(f => f.isRequired).length} required</span>
            ${form.autofillEnabled ? '<span class="${PREFIX}-badge-autofill">Autofill</span>' : ''}
            ${form.accessibilityIssues.length > 0 ? `<span class="${PREFIX}-badge-warning">${form.accessibilityIssues.length} issues</span>` : ''}
          </div>
          ${form.fields.some(f => f.hasError) ? `
            <div class="${PREFIX}-form-errors">
              ${form.fields.filter(f => f.hasError).length} validation errors
            </div>
          ` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderFields(): string {
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
            ${field.isRequired ? '<span class="${PREFIX}-badge-required">Required</span>' : ''}
            ${field.autofill ? `<span class="${PREFIX}-badge-autofill" title="${field.autofill}">🔄</span>` : ''}
          </div>
          ${field.labelText ? `<div class="${PREFIX}-field-label">${escapeHtml(field.labelText)}</div>` : ''}
          <div class="${PREFIX}-field-meta">
            <span class="${PREFIX}-field-selector">${escapeHtml(field.selector)}</span>
            ${!field.hasLabel ? '<span class="${PREFIX}-badge-warning">No Label</span>' : ''}
          </div>
          ${field.value ? `<div class="${PREFIX}-field-value">Value: ${escapeHtml(truncate(field.value, 30))}</div>` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderValidation(): string {
  const targetForm = selectedForm || forms[0];
  
  if (!targetForm) {
    return `<div class="${PREFIX}-empty">No form selected</div>`;
  }

  const invalidFields = targetForm.fields.filter(f => !f.isValid || f.hasError);

  return `
    <div class="${PREFIX}-info">
      ${invalidFields.length} validation issue${invalidFields.length !== 1 ? 's' : ''} • ${targetForm.fields.filter(f => f.isRequired).length} required fields
    </div>
    ${invalidFields.length === 0 ? `
      <div class="${PREFIX}-empty">
        <div>✅ All fields valid</div>
      </div>
    ` : `
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
    `}
  `;
}

function renderAccessibility(): string {
  const allIssues: Array<{ form: string; issue: string }> = [];
  
  forms.forEach(form => {
    form.accessibilityIssues.forEach(issue => {
      allIssues.push({ form: form.name || 'Unnamed', issue });
    });
  });

  // Add field-level issues
  forms.forEach(form => {
    form.fields.forEach(field => {
      if (!field.hasLabel) {
        allIssues.push({ 
          form: form.name || 'Unnamed', 
          issue: `Field "${field.name || field.type}" lacks accessible label` 
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

// ============================================
// Validation Overlays
// ============================================

function updateValidationOverlays(): void {
  if (!highlightIssuesEnabled) {
    removeValidationOverlays();
    return;
  }

  if (!validationOverlays) {
    validationOverlays = document.createElement('div');
    validationOverlays.id = `${PREFIX}-validation-overlays`;
    document.body.appendChild(validationOverlays);
  }

  validationOverlays.innerHTML = '';

  forms.forEach(form => {
    // Highlight form container
    if (form.accessibilityIssues.length > 0) {
      highlightElement(form.element, 'warning', `${form.accessibilityIssues.length} issues`);
    }

    // Highlight fields
    form.fields.forEach(field => {
      if (field.hasError) {
        highlightElement(field.element, 'error', field.validationMessage || 'Invalid');
      } else if (!field.hasLabel) {
        highlightElement(field.element, 'warning', 'No label');
      } else if (field.autofill) {
        highlightElement(field.element, 'info', '🔄');
      }
    });
  });
}

function highlightElement(element: HTMLElement, type: 'error' | 'warning' | 'info', label: string): void {
  const rect = element.getBoundingClientRect();
  
  // Skip elements outside viewport
  if (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth ||
    rect.width === 0 ||
    rect.height === 0
  ) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = `${PREFIX}-validation-overlay ${PREFIX}-validation-${type}`;
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 2147483645;
    border: 2px solid ${getOverlayColor(type)};
    border-radius: 3px;
    background: ${getOverlayColor(type, 0.1)};
  `;

  if (label) {
    const badge = document.createElement('div');
    badge.className = `${PREFIX}-validation-badge`;
    badge.textContent = label;
    badge.style.cssText = `
      position: absolute;
      top: -12px;
      left: 0;
      background: ${getOverlayColor(type)};
      color: white;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    overlay.appendChild(badge);
  }

  validationOverlays?.appendChild(overlay);
}

function getOverlayColor(type: 'error' | 'warning' | 'info', alpha = 1): string {
  switch (type) {
    case 'error':
      return alpha === 1 ? '#dc2626' : `rgba(220, 38, 38, ${alpha})`;
    case 'warning':
      return alpha === 1 ? '#f59e0b' : `rgba(245, 158, 11, ${alpha})`;
    case 'info':
      return alpha === 1 ? '#3b82f6' : `rgba(59, 130, 246, ${alpha})`;
  }
}

function removeValidationOverlays(): void {
  validationOverlays?.remove();
  validationOverlays = null;
}

// ============================================
// Utilities
// ============================================

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function updateStatus(message: string): void {
  const statusEl = shadowRoot?.querySelector(`#${PREFIX}-status`);
  if (statusEl) {
    statusEl.textContent = message;
    setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Ready';
    }, 2000);
  }
}

function updateStats(): void {
  const statsEl = shadowRoot?.querySelector(`#${PREFIX}-stats`);
  if (statsEl) {
    const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
    const validFields = forms.reduce((sum, f) => sum + f.fields.filter(field => field.isValid).length, 0);
    statsEl.textContent = `${validFields}/${totalFields} valid`;
  }
}

function updateBadges(): void {
  updateBadge('forms', forms.length);
  
  const totalFields = forms.reduce((sum, f) => sum + f.fields.length, 0);
  updateBadge('fields', totalFields);
  
  const validationIssues = forms.reduce((sum, f) => sum + f.fields.filter(field => !field.isValid).length, 0);
  updateBadge('validation', validationIssues);
  
  const a11yIssues = forms.reduce((sum, f) => sum + f.accessibilityIssues.length, 0);
  updateBadge('a11y', a11yIssues);
}

function updateBadge(type: string, count: number): void {
  const badge = shadowRoot?.querySelector(`#${PREFIX}-${type}-count`);
  if (badge) badge.textContent = String(count);
}

function filterContent(query: string): void {
  const items = shadowRoot?.querySelectorAll(`.${PREFIX}-form-card, .${PREFIX}-field, .${PREFIX}-validation-item, .${PREFIX}-a11y-issue`);
  items?.forEach((item) => {
    const text = item.textContent?.toLowerCase() || '';
    (item as HTMLElement).style.display = text.includes(query.toLowerCase()) ? '' : 'none';
  });
}

// ============================================
// Auto-refresh & Mutation Observer
// ============================================

function startAutoRefresh(): void {
  if (refreshTimer) return;
  refreshTimer = window.setInterval(() => {
    refresh();
  }, REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function startMutationObserver(): void {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    let shouldRefresh = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (
              node.tagName === 'FORM' ||
              node.tagName === 'INPUT' ||
              node.tagName === 'SELECT' ||
              node.tagName === 'TEXTAREA' ||
              node.querySelector('form, input, select, textarea')
            ) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }

      if (mutation.type === 'attributes') {
        if (['name', 'type', 'required', 'pattern'].includes(mutation.attributeName || '')) {
          shouldRefresh = true;
        }
      }

      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      clearTimeout((refresh as unknown as { _timeout: number })._timeout);
      (refresh as unknown as { _timeout: number })._timeout = window.setTimeout(refresh, 100);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['name', 'type', 'required', 'pattern', 'value', 'disabled'],
  });
}

function stopMutationObserver(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}

// ============================================
// Styles
// ============================================

function getStyles(): string {
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

// ============================================
// Export singleton
// ============================================

export const formDebugger = {
  enable,
  disable,
  toggle,
  getState,
  refresh,
  setHighlightIssues,
  selectForm,
};
