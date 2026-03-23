/**
 * Export Manager UI Components
 *
 * UI component creation for export functionality
 */

import { escapeHtml } from '@/utils/sanitize';
import { formatBytes } from '../../utils/index.js';
import type { ElementData, ExportReport } from './types';

/**
 * Create export button element
 * @param onClick - Click handler
 * @param label - Button label
 * @returns Button element
 */
export function createExportButton(onClick: () => void, label = 'Export'): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = label;
  button.className = 'fdh-export-btn';
  button.style.cssText = `
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.2s;
  `;
  button.addEventListener('mouseover', () => {
    button.style.background = '#2563eb';
  });
  button.addEventListener('mouseout', () => {
    button.style.background = '#3b82f6';
  });
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Create export format selector
 * @param onChange - Change handler
 * @returns Select element
 */
export function createFormatSelector(onChange: (format: string) => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'fdh-format-select';
  select.style.cssText = `
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  `;

  const formats = [
    { value: 'json', label: 'JSON' },
    { value: 'html', label: 'HTML' },
    { value: 'csv', label: 'CSV' },
    { value: 'markdown', label: 'Markdown' },
  ];

  for (const format of formats) {
    const option = document.createElement('option');
    option.value = format.value;
    option.textContent = format.label;
    select.appendChild(option);
  }

  select.addEventListener('change', (e) => {
    onChange((e.target as HTMLSelectElement).value);
  });

  return select;
}

/**
 * Create export dialog/modal
 * @param onExport - Export handler
 * @param onCancel - Cancel handler
 * @returns Dialog container element
 */
export function createExportDialog(
  onExport: (format: string, includeScreenshot: boolean) => void,
  onCancel: () => void
): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'fdh-export-dialog-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.className = 'fdh-export-dialog';
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  const title = document.createElement('h3');
  title.textContent = 'Export Report';
  title.style.cssText = `
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
  `;

  const formatLabel = document.createElement('label');
  formatLabel.textContent = 'Format:';
  formatLabel.style.cssText = `
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
  `;

  let selectedFormat = 'json';
  const formatSelect = createFormatSelector((format) => {
    selectedFormat = format;
  });
  formatSelect.style.width = '100%';
  formatSelect.style.marginBottom = '16px';

  const checkboxContainer = document.createElement('label');
  checkboxContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 24px;
    font-size: 14px;
    cursor: pointer;
  `;

  const screenshotCheckbox = document.createElement('input');
  screenshotCheckbox.type = 'checkbox';
  screenshotCheckbox.style.cssText = `
    width: 16px;
    height: 16px;
    cursor: pointer;
  `;

  checkboxContainer.appendChild(screenshotCheckbox);
  checkboxContainer.appendChild(document.createTextNode('Include screenshot'));

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    padding: 8px 16px;
    background: #f3f4f6;
    color: #374151;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;
  cancelBtn.addEventListener('click', onCancel);

  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export';
  exportBtn.style.cssText = `
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  `;
  exportBtn.addEventListener('click', () => {
    onExport(selectedFormat, screenshotCheckbox.checked);
  });

  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(exportBtn);

  dialog.appendChild(title);
  dialog.appendChild(formatLabel);
  dialog.appendChild(formatSelect);
  dialog.appendChild(checkboxContainer);
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      onCancel();
    }
  });

  return overlay;
}

/**
 * Create preview panel for export data
 * @param report - Export report
 * @returns Panel container element
 */
export function createPreviewPanel(report: ExportReport): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'fdh-preview-panel';
  panel.style.cssText = `
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    max-height: 400px;
    overflow: auto;
  `;

  // Summary section
  const summary = document.createElement('div');
  summary.style.cssText = `
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e5e7eb;
  `;

  const summaryTitle = document.createElement('h4');
  summaryTitle.textContent = 'Report Summary';
  summaryTitle.style.cssText = `
    margin: 0 0 12px 0;
    font-size: 16px;
    font-weight: 600;
  `;
  summary.appendChild(summaryTitle);

  const summaryGrid = document.createElement('div');
  summaryGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    font-size: 13px;
  `;

  const summaryItems = [
    { label: 'Elements', value: report.elements.length },
    { label: 'URL', value: `${escapeHtml(report.pageInfo.url.slice(0, 50))}...` },
    { label: 'Generated', value: new Date(report.timestamp).toLocaleString() },
    { label: 'Version', value: report.version },
  ];

  for (const item of summaryItems) {
    const row = document.createElement('div');
    row.innerHTML = `<span style="color: #6b7280;">${escapeHtml(item.label)}:</span> ${escapeHtml(String(item.value))}`;
    summaryGrid.appendChild(row);
  }

  summary.appendChild(summaryGrid);
  panel.appendChild(summary);

  // Elements preview
  if (report.elements.length > 0) {
    const elementsSection = document.createElement('div');

    const elementsTitle = document.createElement('h4');
    elementsTitle.textContent = `Elements (${report.elements.length})`;
    elementsTitle.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    `;
    elementsSection.appendChild(elementsTitle);

    const elementsList = document.createElement('div');
    elementsList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    for (const element of report.elements.slice(0, 5)) {
      const elementCard = createElementPreviewCard(element);
      elementsList.appendChild(elementCard);
    }

    if (report.elements.length > 5) {
      const moreText = document.createElement('div');
      moreText.textContent = `+ ${report.elements.length - 5} more elements`;
      moreText.style.cssText = `
        text-align: center;
        color: #6b7280;
        font-size: 13px;
        padding: 8px;
      `;
      elementsList.appendChild(moreText);
    }

    elementsSection.appendChild(elementsList);
    panel.appendChild(elementsSection);
  }

  // Performance metrics
  if (report.performance) {
    const perfSection = document.createElement('div');
    perfSection.style.cssText = 'margin-top: 16px;';

    const perfTitle = document.createElement('h4');
    perfTitle.textContent = 'Performance Metrics';
    perfTitle.style.cssText = `
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
    `;
    perfSection.appendChild(perfTitle);

    const perfGrid = document.createElement('div');
    perfGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 13px;
    `;

    const perfItems = [
      { label: 'Load Time', value: `${report.performance.loadTime}ms` },
      { label: 'DOM Content Loaded', value: `${report.performance.domContentLoaded}ms` },
      { label: 'First Paint', value: `${report.performance.firstPaint.toFixed(2)}ms` },
      {
        label: 'First Contentful Paint',
        value: `${report.performance.firstContentfulPaint.toFixed(2)}ms`,
      },
      { label: 'Resource Count', value: report.performance.resourceCount },
      { label: 'Transfer Size', value: formatBytes(report.performance.totalTransferSize) },
    ];

    for (const item of perfItems) {
      const row = document.createElement('div');
      row.innerHTML = `<span style="color: #6b7280;">${escapeHtml(item.label)}:</span> ${escapeHtml(String(item.value))}`;
      perfGrid.appendChild(row);
    }

    perfSection.appendChild(perfGrid);
    panel.appendChild(perfSection);
  }

  return panel;
}

/**
 * Create element preview card
 * @param element - Element data
 * @returns Card element
 */
function createElementPreviewCard(element: ElementData): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = `
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    font-size: 13px;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `;

  const tagBadge = document.createElement('span');
  tagBadge.textContent = element.tag;
  tagBadge.style.cssText = `
    background: #dbeafe;
    color: #1e40af;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  `;
  header.appendChild(tagBadge);

  if (element.id) {
    const idBadge = document.createElement('span');
    idBadge.textContent = `#${element.id}`;
    idBadge.style.cssText = `
      color: #6b7280;
      font-family: monospace;
    `;
    header.appendChild(idBadge);
  }

  card.appendChild(header);

  const details = document.createElement('div');
  details.style.cssText = `
    color: #6b7280;
    font-size: 12px;
  `;
  details.innerHTML = `
    <div>${escapeHtml(element.selector)}</div>
    <div>${element.dimensions.width}×${element.dimensions.height}px • ${element.children} children</div>
  `;
  card.appendChild(details);

  return card;
}

/**
 * Create toast notification
 * @param message - Toast message
 * @param type - Toast type
 * @returns Toast element
 */
export function createToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): HTMLElement {
  const toast = document.createElement('div');
  toast.className = `fdh-toast fdh-toast--${type}`;

  const colors = {
    success: { bg: '#10b981', text: '#ffffff' },
    error: { bg: '#ef4444', text: '#ffffff' },
    info: { bg: '#3b82f6', text: '#ffffff' },
  };

  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 12px 20px;
    background: ${colors[type].bg};
    color: ${colors[type].text};
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10001;
    animation: fdh-toast-in 0.3s ease;
  `;

  toast.textContent = message;

  // Add animation keyframes if not already added
  if (!document.getElementById('fdh-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'fdh-toast-styles';
    style.textContent = `
      @keyframes fdh-toast-in {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fdh-toast-out {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'fdh-toast-out 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);

  return toast;
}

/**
 * Create loading spinner
 * @returns Spinner element
 */
export function createSpinner(): HTMLElement {
  const spinner = document.createElement('div');
  spinner.className = 'fdh-spinner';
  spinner.style.cssText = `
    width: 24px;
    height: 24px;
    border: 2px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: fdh-spin 1s linear infinite;
  `;

  // Add animation keyframes if not already added
  if (!document.getElementById('fdh-spinner-styles')) {
    const style = document.createElement('style');
    style.id = 'fdh-spinner-styles';
    style.textContent = `
      @keyframes fdh-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return spinner;
}
