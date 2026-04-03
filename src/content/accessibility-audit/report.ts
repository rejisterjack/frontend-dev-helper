/**
 * Report Generation for Accessibility Audit
 */

import { escapeHtml } from '@/utils/sanitize';
import { COLORS } from './constants';
import type { AccessibilityReport, ContrastIssue, IssueSeverity } from './types';

// State references (set by core)
let showFocusOrderRef = true;
let highlightIssuesRef = true;

/**
 * Set state references for report UI
 */
export function setReportState(showFocusOrder: boolean, highlightIssues: boolean): void {
  showFocusOrderRef = showFocusOrder;
  highlightIssuesRef = highlightIssues;
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: IssueSeverity): string {
  if (severity === 'error') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🔵';
}

/**
 * Get severity color
 */
function getSeverityColor(severity: IssueSeverity): string {
  if (severity === 'error') return COLORS.error;
  if (severity === 'warning') return COLORS.warning;
  return COLORS.info;
}

const SEVERITY_ORDER: IssueSeverity[] = ['error', 'warning', 'info'];
const SEVERITY_GROUP_LABEL: Record<IssueSeverity, string> = {
  error: 'Errors',
  warning: 'Warnings',
  info: 'Info',
};

function formatIssueRow(
  i: { severity: IssueSeverity; message?: string; element?: string },
  fontSize = '12px'
): string {
  return `
      <div style="
        padding: 10px 12px;
        margin-bottom: 8px;
        background: ${COLORS.bgPanelLight};
        border-left: 3px solid ${getSeverityColor(i.severity)};
        border-radius: 0 8px 8px 0;
        font-size: ${fontSize};
      ">
        <span style="color: ${getSeverityColor(i.severity)}; margin-right: 6px;">${getSeverityIcon(i.severity)}</span>
        <span style="color: ${COLORS.textSecondary};">${escapeHtml(i.element || 'element')}:</span> ${escapeHtml(i.message || 'Issue detected')}
      </div>
    `;
}

/**
 * Format issues grouped by severity (errors first, then warnings, then info).
 */
function formatIssuesGroupedBySeverity(
  issues: Array<{ severity: IssueSeverity; message?: string; element?: string }>,
  emptyMsg: string
): string {
  if (issues.length === 0) {
    return `<div style="color: ${COLORS.success}; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">✓ ${escapeHtml(emptyMsg)}</div>`;
  }
  const bySev = new Map<IssueSeverity, typeof issues>();
  for (const s of SEVERITY_ORDER) {
    bySev.set(s, []);
  }
  for (const i of issues) {
    bySev.get(i.severity)?.push(i);
  }
  const parts: string[] = [];
  for (const sev of SEVERITY_ORDER) {
    const list = bySev.get(sev) ?? [];
    if (list.length === 0) continue;
    parts.push(`
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${getSeverityColor(sev)}; margin: 12px 0 6px 0;">
        ${SEVERITY_GROUP_LABEL[sev]} (${list.length})
      </div>
      ${list.map((row) => formatIssueRow(row)).join('')}
    `);
  }
  return parts.join('');
}

function formatContrastIssuesGrouped(issues: ContrastIssue[], maxVisible: number): string {
  if (issues.length === 0) {
    return '';
  }
  const rank = (s: IssueSeverity) => SEVERITY_ORDER.indexOf(s);
  const sorted = [...issues].sort((a, b) => rank(a.severity) - rank(b.severity));
  const parts: string[] = [];
  let shown = 0;
  for (const sev of SEVERITY_ORDER) {
    const group = sorted.filter((i) => i.severity === sev);
    if (group.length === 0) continue;
    parts.push(`
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: ${getSeverityColor(sev)}; margin: 12px 0 6px 0;">
        ${SEVERITY_GROUP_LABEL[sev]} (${group.length})
      </div>
    `);
    for (const i of group) {
      if (shown >= maxVisible) break;
      parts.push(`
            <div style="
              padding: 10px 12px;
              margin-bottom: 8px;
              background: ${COLORS.bgPanelLight};
              border-left: 3px solid ${getSeverityColor(i.severity)};
              border-radius: 0 8px 8px 0;
              font-size: 11px;
            ">
              <div style="margin-bottom: 4px;">
                <span style="color: ${getSeverityColor(i.severity)};">${getSeverityIcon(i.severity)}</span>
                <span style="color: ${COLORS.textSecondary};">${escapeHtml(i.element)}:</span> ${i.ratio}:1 (needs ${i.requiredRatio}:1)
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <span style="padding: 2px 8px; background: ${escapeHtml(i.foreground)}; color: ${escapeHtml(i.background)}; border-radius: 4px; font-size: 10px;">Aa</span>
                <span style="color: ${COLORS.textMuted}; font-size: 10px;">${escapeHtml(i.foreground)} on ${escapeHtml(i.background)}</span>
              </div>
            </div>
          `);
      shown++;
    }
    if (shown >= maxVisible) break;
  }
  const more = issues.length - shown;
  if (more > 0) {
    parts.push(
      `<div style="text-align: center; color: ${COLORS.textMuted}; font-size: 11px;">...and ${more} more</div>`
    );
  }
  return parts.join('');
}

/**
 * Build report content HTML
 */
export function buildReportContent(report: AccessibilityReport): string {
  const { summary } = report;

  return `
    <!-- Header -->
    <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(99, 102, 241, 0.3); padding-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 18px; color: ${COLORS.accent}; display: flex; align-items: center; gap: 8px;">
          ♿ Accessibility Audit
        </h3>
        <button
          type="button" class="fdh-audit-close" style="
          background: transparent;
          border: none;
          color: ${COLORS.textSecondary};
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: color 0.2s;
        ">×</button>
      </div>
      
      <!-- Summary Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <div style="
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.1));
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(99, 102, 241, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: ${COLORS.primaryLight};">${summary.totalIssues}</div>
          <div style="font-size: 10px; color: ${COLORS.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">Total</div>
        </div>
        <div style="
          background: rgba(239, 68, 68, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(239, 68, 68, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: ${COLORS.error};">${summary.errors}</div>
          <div style="font-size: 10px; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px;">Errors</div>
        </div>
        <div style="
          background: rgba(245, 158, 11, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(245, 158, 11, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: ${COLORS.warning};">${summary.warnings}</div>
          <div style="font-size: 10px; color: #fbbf24; text-transform: uppercase; letter-spacing: 0.5px;">Warnings</div>
        </div>
        <div style="
          background: rgba(59, 130, 246, 0.15);
          border-radius: 10px;
          padding: 12px;
          text-align: center;
          border: 1px solid rgba(59, 130, 246, 0.3);
        ">
          <div style="font-size: 24px; font-weight: 700; color: ${COLORS.info};">${summary.info}</div>
          <div style="font-size: 10px; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px;">Info</div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <button
        type="button" class="fdh-toggle-focus" style="
        flex: 1;
        background: ${showFocusOrderRef ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: ${COLORS.primaryLight};
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">${showFocusOrderRef ? '🔢 Hide' : '🔢 Show'} Focus Order</button>
      <button
        type="button" class="fdh-toggle-highlights" style="
        flex: 1;
        background: ${highlightIssuesRef ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.1)'};
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: ${COLORS.primaryLight};
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">${highlightIssuesRef ? '🎯 Hide' : '🎯 Show'} Highlights</button>
      <button
        type="button" class="fdh-rerun-audit" style="
        flex: 1;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 8px;
        padding: 10px;
        color: #4ade80;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      ">🔄 Rerun</button>
    </div>

    <!-- ARIA Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="aria">
        <span style="font-weight: 600; color: ${COLORS.accent};">🏷️ ARIA (${report.aria.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-aria" style="display: block;">
        ${formatIssuesGroupedBySeverity(report.aria.issues, 'No ARIA issues found')}
      </div>
    </div>

    <!-- Focus Order Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="focus">
        <span style="font-weight: 600; color: ${COLORS.accent};">🎯 Focus Order (${report.focusOrder.items.length} elements)</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-focus" style="display: ${report.focusOrder.issues.length > 0 ? 'block' : 'none'};">
        ${
          report.focusOrder.issues.length > 0
            ? report.focusOrder.issues
                .map(
                  (i) => `
            <div style="padding: 8px 12px; margin-bottom: 6px; background: rgba(239, 68, 68, 0.1); border-radius: 6px; font-size: 11px;">
              <span style="color: ${COLORS.error};">⚠</span> #${i.index} ${escapeHtml(i.element)} - ${i.visible ? 'custom tabindex' : 'not visible'}
            </div>
          `
                )
                .join('')
            : '<div style="color: #22c55e; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px; font-size: 12px;">✓ Focus order looks good</div>'
        }
      </div>
    </div>

    <!-- Color Contrast Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="contrast">
        <span style="font-weight: 600; color: ${COLORS.accent};">🎨 Color Contrast (${report.contrast.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-contrast" style="display: block;">
        ${
          report.contrast.issues.length === 0
            ? `<div style="color: ${COLORS.success}; padding: 12px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">✓ All text meets contrast requirements</div>`
            : formatContrastIssuesGrouped(report.contrast.issues, 10)
        }
      </div>
    </div>

    <!-- Alt Text Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="alt">
        <span style="font-weight: 600; color: ${COLORS.accent};">🖼️ Alt Text (${report.altText.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-alt" style="display: block;">
        ${formatIssuesGroupedBySeverity(
          report.altText.issues.map((i) => ({ ...i, message: `Missing alt: ${i.src}` })),
          'All images have alt text'
        )}
      </div>
    </div>

    <!-- Form Labels Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="labels">
        <span style="font-weight: 600; color: ${COLORS.accent};">📝 Form Labels (${report.formLabels.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-labels" style="display: block;">
        ${formatIssuesGroupedBySeverity(
          report.formLabels.issues.map((i) => ({ ...i, element: i.inputType })),
          'All form inputs are properly labeled'
        )}
      </div>
    </div>

    <!-- Keyboard Navigation Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="keyboard">
        <span style="font-weight: 600; color: ${COLORS.accent};">⌨️ Keyboard Nav (${report.keyboardNav.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-keyboard" style="display: block;">
        ${formatIssuesGroupedBySeverity(
          report.keyboardNav.issues.map((i) => ({ ...i, element: i.element })),
          'No keyboard navigation issues'
        )}
      </div>
    </div>

    ${
      report.headings
        ? `
    <!-- Headings Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="headings">
        <span style="font-weight: 600; color: ${COLORS.accent};">📑 Headings (${report.headings.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-headings" style="display: block;">
        ${formatIssuesGroupedBySeverity(
          report.headings.issues.map((i) => ({ ...i, message: i.message })),
          'Heading structure is valid'
        )}
      </div>
    </div>
    `
        : ''
    }

    ${
      report.landmarks
        ? `
    <!-- Landmarks Section -->
    <div style="margin-bottom: 16px;">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: ${COLORS.bgPanel};
        border-radius: 8px;
        cursor: pointer;
        margin-bottom: 8px;
      " class="fdh-section-header" data-section="landmarks">
        <span style="font-weight: 600; color: ${COLORS.accent};">🗺️ Landmarks (${report.landmarks.count})</span>
        <span style="color: ${COLORS.textMuted};">▼</span>
      </div>
      <div class="fdh-section-content fdh-section-landmarks" style="display: block;">
        ${formatIssuesGroupedBySeverity(
          report.landmarks.issues.map((i) => ({ ...i, message: i.message })),
          'Landmark structure is valid'
        )}
      </div>
    </div>
    `
        : ''
    }

    <!-- Footer -->
    <div style="
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid rgba(99, 102, 241, 0.3);
      text-align: center;
      font-size: 11px;
      color: ${COLORS.textMuted};
    ">
      <div>Audited: ${new Date(report.timestamp).toLocaleString()}</div>
      <div style="margin-top: 8px;">
        <button
          type="button" class="fdh-export-report" style="
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 6px;
          padding: 8px 16px;
          color: ${COLORS.primaryLight};
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        ">📋 Copy Report</button>
        <button
          type="button" class="fdh-export-json-report" style="
          margin-left: 8px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.35);
          border-radius: 6px;
          padding: 8px 16px;
          color: #86efac;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        ">⬇ JSON</button>
        <button
          type="button" class="fdh-export-md-report" style="
          margin-left: 8px;
          background: rgba(59, 130, 246, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.35);
          border-radius: 6px;
          padding: 8px 16px;
          color: #93c5fd;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        ">⬇ Markdown</button>
      </div>
      <div style="margin-top: 12px;">
        Press <kbd style="background: rgba(99, 102, 241, 0.2); padding: 2px 6px; border-radius: 4px;">ESC</kbd> to close
      </div>
    </div>
  `;
}

/**
 * Generate text report for clipboard export
 */
export function generateTextReport(report: AccessibilityReport): string {
  return `
Accessibility Audit Report
==========================
URL: ${report.url}
Date: ${new Date(report.timestamp).toLocaleString()}

Summary
-------
Total Issues: ${report.summary.totalIssues}
Errors: ${report.summary.errors}
Warnings: ${report.summary.warnings}
Info: ${report.summary.info}

ARIA Issues (${report.aria.count})
-------------------
${report.aria.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.message}`).join('\n') || 'None'}

Focus Order (${report.focusOrder.items.length} elements, ${report.focusOrder.issues.length} issues)
-----------
${report.focusOrder.issues.map((i) => `#${i.index} ${i.element} - ${i.visible ? 'custom tabindex' : 'not visible'}`).join('\n') || 'No issues'}

Color Contrast Issues (${report.contrast.count})
---------------------
${report.contrast.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.ratio}:1 (needs ${i.requiredRatio}:1)`).join('\n') || 'None'}

Missing Alt Text (${report.altText.count})
-----------------
${report.altText.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.src}`).join('\n') || 'None'}

Form Label Issues (${report.formLabels.count})
------------------
${report.formLabels.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.inputType}: ${i.message}`).join('\n') || 'None'}

Keyboard Navigation Issues (${report.keyboardNav.count})
---------------------------
${report.keyboardNav.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.issue}`).join('\n') || 'None'}

${
  report.headings
    ? `Heading Structure Issues (${report.headings.count})
------------------------
${report.headings.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.message}`).join('\n') || 'None'}
`
    : ''
}${
  report.landmarks
    ? `Landmark Issues (${report.landmarks.count})
----------------
${report.landmarks.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.element}: ${i.message}`).join('\n') || 'None'}
`
    : ''
}`.trim();
}

function mdGroupedList<T extends { severity: IssueSeverity }>(issues: T[], line: (i: T) => string): string[] {
  const out: string[] = [];
  if (issues.length === 0) {
    out.push('_None_');
    return out;
  }
  const bySev = new Map<IssueSeverity, T[]>();
  for (const s of SEVERITY_ORDER) {
    bySev.set(s, []);
  }
  for (const i of issues) {
    bySev.get(i.severity)?.push(i);
  }
  for (const sev of SEVERITY_ORDER) {
    const list = bySev.get(sev) ?? [];
    if (list.length === 0) continue;
    out.push(`### ${SEVERITY_GROUP_LABEL[sev]} (${list.length})`);
    for (const i of list) {
      out.push(`- ${line(i)}`);
    }
  }
  return out;
}

/** Markdown export (grouped by severity within each section). */
export function generateMarkdownReport(report: AccessibilityReport): string {
  const lines: string[] = [
    '# Accessibility audit',
    '',
    `- **URL:** ${report.url}`,
    `- **Date:** ${new Date(report.timestamp).toLocaleString()}`,
    '',
    '## Summary',
    `- Total issues: ${report.summary.totalIssues}`,
    `- Errors: ${report.summary.errors}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Info: ${report.summary.info}`,
    '',
    '## ARIA',
    ...mdGroupedList(report.aria.issues, (i) => `**${i.element}**: ${i.message}`),
    '',
    '## Focus order',
    ...(report.focusOrder.issues.length === 0
      ? ['_No issues_']
      : report.focusOrder.issues.map(
          (i) =>
            `- #${i.index} **${i.element}** — ${i.visible ? 'custom tabindex' : 'not visible'}`
        )),
    '',
    '## Color contrast',
    ...mdGroupedList(report.contrast.issues, (i) => {
      return `**${i.element}**: ${i.ratio}:1 (needs ${i.requiredRatio}:1) — ${i.foreground} on ${i.background}`;
    }),
    '',
    '## Alt text',
    ...mdGroupedList(
      report.altText.issues,
      (i) => `**${i.element}**: missing alt (\`${i.src}\`)`
    ),
    '',
    '## Form labels',
    ...mdGroupedList(report.formLabels.issues, (i) => `**${i.inputType}**: ${i.message}`),
    '',
    '## Keyboard navigation',
    ...mdGroupedList(report.keyboardNav.issues, (i) => `**${i.element}**: ${i.issue}`),
  ];

  if (report.headings) {
    lines.push('', '## Headings', ...mdGroupedList(report.headings.issues, (i) => `**${i.element}**: ${i.message}`));
  }
  if (report.landmarks) {
    lines.push('', '## Landmarks', ...mdGroupedList(report.landmarks.issues, (i) => `**${i.element}**: ${i.message}`));
  }

  return lines.join('\n');
}
