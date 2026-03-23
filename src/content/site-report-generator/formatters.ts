/**
 * Site Report Generator Formatters
 */

import type { MetricScore, SiteReport } from './types';
import { escapeHtml, getScoreColor } from './utils';

export function exportReportAsJSON(report: SiteReport): void {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `site-report-${report.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReportAsHTML(report: SiteReport): void {
  const html = generateFullHTMLReport(report);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `site-report-${report.id}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(report: SiteReport): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = generateFullHTMLReport(report);
  printWindow.document.open();
  printWindow.document.close();
  printWindow.document.write = () => {};
  printWindow.document.documentElement.innerHTML = html.replace('<!DOCTYPE html>', '');
  setTimeout(() => printWindow.print(), 100);
}

export function generateFullHTMLReport(report: SiteReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Report - ${escapeHtml(report.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 32px; background: linear-gradient(135deg, #6366f1, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px; }
    .subtitle { color: #64748b; margin-bottom: 4px; }
    .url { font-size: 12px; color: #475569; }
    .score-circle {
      width: 160px; height: 160px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 48px; font-weight: bold;
      margin: 20px auto;
      background: conic-gradient(${getScoreColor(report.scores.overall)} ${report.scores.overall}%, #1e293b 0);
    }
    .score-inner { width: 130px; height: 130px; border-radius: 50%; background: #0f172a; display: flex; align-items: center; justify-content: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 40px 0; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; }
    .card h3 { color: #94a3b8; font-size: 14px; text-transform: uppercase; margin-bottom: 8px; }
    .card .score { font-size: 36px; font-weight: bold; }
    .recommendation { background: #1e293b; border-left: 4px solid #6366f1; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .priority-high { border-color: #ef4444; }
    .priority-medium { border-color: #eab308; }
    .priority-low { border-color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(report.title)}</h1>
    <p class="subtitle">${escapeHtml(report.url)}</p>
    <p class="url">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
    
    <div class="score-circle">
      <div class="score-inner">${report.scores.overall}</div>
    </div>
    
    <div class="grid">
      <div class="card">
        <h3>Performance</h3>
        <div class="score" style="color: ${getScoreColor(report.scores.performance)}">${report.scores.performance}</div>
      </div>
      <div class="card">
        <h3>Accessibility</h3>
        <div class="score" style="color: ${getScoreColor(report.scores.accessibility)}">${report.scores.accessibility}</div>
      </div>
      <div class="card">
        <h3>SEO</h3>
        <div class="score" style="color: ${getScoreColor(report.scores.seo)}">${report.scores.seo}</div>
      </div>
      <div class="card">
        <h3>Best Practices</h3>
        <div class="score" style="color: ${getScoreColor(report.scores.bestPractices)}">${report.scores.bestPractices}</div>
      </div>
    </div>
    
    <h2 style="margin: 40px 0 20px;">Recommendations</h2>
    ${report.recommendations
      .map(
        (rec) => `
      <div class="recommendation priority-${rec.priority}">
        <h4>${escapeHtml(rec.title)}</h4>
        <p>${escapeHtml(rec.description)}</p>
        <small>Impact: ${rec.impact} | Effort: ${rec.effort}</small>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;
}

export function renderScoreCard(title: string, score: number, icon: string): string {
  const color = getScoreColor(score);
  return `
    <div style="background: rgba(30, 41, 59, 0.8); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">${icon}</div>
      <div style="font-size: 36px; font-weight: bold; color: ${color};">${score}</div>
      <div style="font-size: 14px; color: #94a3b8; text-transform: uppercase;">${escapeHtml(title)}</div>
    </div>
  `;
}

export function renderVitalCard(name: string, metric: MetricScore, description: string): string {
  const color = getScoreColor(metric.score);
  return `
    <div style="background: rgba(30, 41, 59, 0.6); border-radius: 8px; padding: 16px; margin: 8px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600;">${escapeHtml(name)}</span>
        <span style="font-size: 24px; font-weight: bold; color: ${color};">
          ${metric.value !== null ? metric.value.toFixed(2) : 'N/A'} ${metric.unit}
        </span>
      </div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">${escapeHtml(description)}</div>
    </div>
  `;
}
