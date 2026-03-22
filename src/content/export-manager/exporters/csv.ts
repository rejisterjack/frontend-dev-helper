/**
 * CSV Exporter
 *
 * Handles CSV export generation
 */

import type { ElementData, ExportReport } from '../types';

/**
 * Escape CSV value
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert elements data to CSV
 * @param elements - Element data array
 * @returns CSV string
 */
export function elementsToCSV(elements: ElementData[]): string {
  const headers = [
    'Selector',
    'Tag',
    'ID',
    'Class',
    'Width',
    'Height',
    'Top',
    'Left',
    'Children',
    'Text',
    'Role',
    'Label',
  ];

  const lines: string[] = [headers.join(',')];

  for (const element of elements) {
    const row = [
      escapeCSV(element.selector),
      escapeCSV(element.tag),
      escapeCSV(element.id),
      escapeCSV(element.class),
      escapeCSV(element.dimensions.width),
      escapeCSV(element.dimensions.height),
      escapeCSV(element.dimensions.top),
      escapeCSV(element.dimensions.left),
      escapeCSV(element.children),
      escapeCSV(element.text?.slice(0, 200)),
      escapeCSV(element.accessibility.role),
      escapeCSV(element.accessibility.label),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Export report as CSV
 * @param report - Export report
 * @param filename - Optional custom filename
 * @returns Blob and filename
 */
export function exportReportAsCSV(
  report: ExportReport,
  filename?: string
): { blob: Blob; filename: string } {
  const csv = elementsToCSV(report.elements);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const finalFilename = filename
    ? `${filename}.csv`
    : `elements-${new Date().toISOString().split('T')[0]}.csv`;

  return { blob, filename: finalFilename };
}

/**
 * Convert report metadata to CSV
 * @param report - Export report
 * @returns CSV string
 */
export function reportMetadataToCSV(report: ExportReport): string {
  const lines: string[] = ['Property,Value'];

  lines.push(`Report ID,${escapeCSV(report.id)}`);
  lines.push(`Generated,${escapeCSV(new Date(report.timestamp).toISOString())}`);
  lines.push(`Version,${escapeCSV(report.version)}`);

  if (report.pageInfo) {
    lines.push(`URL,${escapeCSV(report.pageInfo.url)}`);
    lines.push(`Title,${escapeCSV(report.pageInfo.title)}`);
    lines.push(
      `Viewport,${escapeCSV(`${report.pageInfo.viewport.width}×${report.pageInfo.viewport.height}`)}`
    );
  }

  if (report.performance) {
    lines.push(`Load Time,${escapeCSV(`${report.performance.loadTime}ms`)}`);
    lines.push(`DOM Content Loaded,${escapeCSV(`${report.performance.domContentLoaded}ms`)}`);
    lines.push(`First Paint,${escapeCSV(`${report.performance.firstPaint.toFixed(2)}ms`)}`);
    lines.push(`Resource Count,${escapeCSV(report.performance.resourceCount)}`);
  }

  return lines.join('\n');
}

/**
 * Generate CSV from generic object array
 * @param data - Array of objects
 * @param headers - Optional custom headers
 * @returns CSV string
 */
export function generateCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]);
  const lines: string[] = [keys.map(escapeCSV).join(',')];

  for (const row of data) {
    const values = keys.map((key) => escapeCSV(String(row[key] ?? '')));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Export data as CSV file
 * @param data - Array of objects
 * @param filename - Optional custom filename
 * @param headers - Optional custom headers
 * @returns Blob and filename
 */
export function exportAsCSV(
  data: Record<string, unknown>[],
  filename?: string,
  headers?: string[]
): { blob: Blob; filename: string } {
  const csv = generateCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const finalFilename = filename
    ? `${filename}.csv`
    : `export-${new Date().toISOString().split('T')[0]}.csv`;

  return { blob, filename: finalFilename };
}
