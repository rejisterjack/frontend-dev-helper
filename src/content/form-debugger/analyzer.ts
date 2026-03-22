/**
 * Form Analyzer
 *
 * Form analysis logic for detecting and analyzing forms on the page.
 */

import type { FormField, FormInfo } from '@/types';
import { AUTOFILL_FIELDS } from './constants';
import type { LabelInfo } from './types';

/**
 * Analyze all forms on the page
 */
export function analyzeForms(): FormInfo[] {
  const formElements = Array.from(document.querySelectorAll('form'));

  const forms: FormInfo[] = formElements.map((form, index) => analyzeForm(form, index));

  // Also find form-like structures (inputs not in forms)
  const orphanedInputs = Array.from(
    document.querySelectorAll(
      'input:not(form input), select:not(form select), textarea:not(form textarea)'
    )
  );
  if (orphanedInputs.length > 0) {
    forms.push(createOrphanedForm(orphanedInputs));
  }

  return forms;
}

/**
 * Analyze a single form element
 */
export function analyzeForm(form: HTMLFormElement, index: number): FormInfo {
  const fields = analyzeFormFields(form);
  const accessibilityIssues = checkAccessibilityIssues(form, fields);

  return {
    element: form,
    selector: generateSelector(form),
    name: form.name || form.id || `Form ${index + 1}`,
    action: form.action || window.location.href,
    method: form.method || 'GET',
    fields,
    isValid: fields.every((f) => f.isValid),
    hasSubmitHandler: hasSubmitHandler(form),
    autofillEnabled: fields.some((f) => f.autofill),
    accessibilityIssues,
  };
}

/**
 * Analyze form fields within a form
 */
export function analyzeFormFields(form: HTMLFormElement): FormField[] {
  const fieldSelectors = 'input, select, textarea, button';
  const fields = Array.from(
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      fieldSelectors
    )
  );

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

/**
 * Create a virtual form for orphaned inputs (inputs not in a form)
 */
export function createOrphanedForm(inputs: Element[]): FormInfo {
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
    isValid: fields.every((f) => f.isValid),
    hasSubmitHandler: false,
    autofillEnabled: fields.some((f) => f.autofill),
    accessibilityIssues,
  };
}

/**
 * Get label information for a form field
 */
export function getLabelInfo(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): LabelInfo {
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

/**
 * Detect autofill/autocomplete attribute for a field
 */
export function detectAutofill(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string | undefined {
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

/**
 * Check if a form has a submit handler
 */
export function hasSubmitHandler(form: HTMLFormElement): boolean {
  // Check for onsubmit attribute
  if (form.hasAttribute('onsubmit')) return true;

  // Check for submit button
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) return true;

  // Note: Event listeners can't be directly detected
  return false;
}

/**
 * Check accessibility issues for a form
 */
export function checkAccessibilityIssues(form: HTMLFormElement, fields: FormField[]): string[] {
  const issues: string[] = [];

  // Check for missing form label
  if (!form.getAttribute('aria-label') && !form.getAttribute('aria-labelledby') && !form.id) {
    issues.push('Form lacks accessible name');
  }

  // Check for fields without labels
  const unlabeledFields = fields.filter((f) => !f.hasLabel);
  if (unlabeledFields.length > 0) {
    issues.push(`${unlabeledFields.length} fields without proper labels`);
  }

  // Check for required fields without required attribute
  const requiredByName = fields.filter(
    (f) =>
      !f.isRequired && (f.name.includes('required') || f.element.className.includes('required'))
  );
  if (requiredByName.length > 0) {
    issues.push(`${requiredByName.length} fields appear required but lack required attribute`);
  }

  // Check for missing error message containers
  const fieldsWithErrors = fields.filter((f) => f.isRequired && !f.isValid);
  if (fieldsWithErrors.length > 0 && !form.querySelector('[role="alert"], .error, [aria-live]')) {
    issues.push('Form may lack error message announcement for screen readers');
  }

  return issues;
}

/**
 * Check accessibility issues for orphaned inputs
 */
export function checkOrphanedAccessibilityIssues(inputs: Element[]): string[] {
  const issues: string[] = [];
  issues.push('Fields exist outside of a form element');

  const unlabeledCount = inputs.filter((input) => {
    const field = input as HTMLInputElement;
    return !field.id || !document.querySelector(`label[for="${field.id}"]`);
  }).length;

  if (unlabeledCount > 0) {
    issues.push(`${unlabeledCount} orphaned fields without labels`);
  }

  return issues;
}

/**
 * Generate a CSS selector for an element
 */
export function generateSelector(element: HTMLElement): string {
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

/**
 * Check if an element is a form field
 */
export function isFormField(element: HTMLElement): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

/**
 * Update field validity based on current element state
 */
export function updateFieldValidity(
  field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  forms: FormInfo[]
): void {
  const formInfo = forms.find((f) => f.element.contains(field));
  if (!formInfo) return;

  const fieldInfo = formInfo.fields.find((f) => f.element === field);
  if (fieldInfo) {
    fieldInfo.isValid = (field as HTMLInputElement).checkValidity?.() ?? true;
    fieldInfo.validationMessage = (field as HTMLInputElement).validationMessage || '';
    fieldInfo.hasError = !fieldInfo.isValid || fieldInfo.validationMessage !== '';
    fieldInfo.value = field.value;
  }
}
