export interface AuditResult {
  url: string;
  timestamp: number;
  overallScore: number;
  categories: {
    accessibility: { score: number; issues: AuditIssue[] };
    performance: { score: number; issues: AuditIssue[] };
    seo: { score: number; issues: AuditIssue[] };
    bestPractices: { score: number; issues: AuditIssue[] };
    css: { score: number; issues: AuditIssue[] };
  };
}

export interface AuditIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor' | 'info';
  category: string;
  title: string;
  description: string;
  selector?: string;
  suggestedFix?: string;
}

function scoreColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Poor';
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
}

function totalIssues(result: AuditResult): number {
  return Object.values(result.categories).reduce(
    (sum, cat) => sum + cat.issues.length,
    0,
  );
}

function criticalCount(result: AuditResult): number {
  return Object.values(result.categories).reduce(
    (sum, cat) =>
      sum +
      cat.issues.filter((i) => i.severity === 'critical' || i.severity === 'serious').length,
    0,
  );
}

export function exportAsJSON(result: AuditResult): string {
  return JSON.stringify(result, null, 2);
}

export function exportAsHTML(result: AuditResult): string {
  const catEntries = Object.entries(result.categories) as [
    string,
    { score: number; issues: AuditIssue[] },
  ][];

  const circumference = 2 * Math.PI * 54;
  const overallOffset = circumference - (circumference * result.overallScore) / 100;

  const catCards = catEntries
    .map(([key, cat]) => {
      const catCirc = 2 * Math.PI * 36;
      const catOffset = catCirc - (catCirc * cat.score) / 100;
      const catLabel = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase());

      const issueRows = cat.issues
        .map(
          (issue) => `
          <tr>
            <td><span class="severity-badge severity-${issue.severity}">${issue.severity}</span></td>
            <td>${escapeHtml(issue.title)}</td>
            <td>${escapeHtml(issue.description)}</td>
            <td>${issue.suggestedFix ? escapeHtml(issue.suggestedFix) : '—'}</td>
          </tr>`,
        )
        .join('');

      return `
      <div class="category-card">
        <div class="category-header">
          <div class="category-score-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" stroke-width="6"/>
              <circle cx="40" cy="40" r="36" fill="none" stroke="${scoreColor(cat.score)}" stroke-width="6"
                stroke-dasharray="${catCirc}" stroke-dashoffset="${catOffset}"
                stroke-linecap="round" transform="rotate(-90 40 40)"/>
            </svg>
            <span class="category-score-value" style="color:${scoreColor(cat.score)}">${cat.score}</span>
          </div>
          <div class="category-info">
            <h3>${catLabel}</h3>
            <p>${cat.issues.length} issue${cat.issues.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        ${cat.issues.length > 0 ? `
        <table class="issue-table">
          <thead>
            <tr><th>Severity</th><th>Title</th><th>Description</th><th>Fix</th></tr>
          </thead>
          <tbody>${issueRows}</tbody>
        </table>` : '<p class="pass-text">All checks passed!</p>'}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit Report — ${escapeHtml(result.url)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; line-height: 1.5; }
  .report { max-width: 900px; margin: 0 auto; }
  .header { text-align: center; padding: 32px 16px; margin-bottom: 32px; background: #1e293b; border-radius: 16px; }
  .header h1 { font-size: 24px; margin-bottom: 8px; }
  .header .url { font-size: 13px; color: #94a3b8; word-break: break-all; }
  .header .timestamp { font-size: 12px; color: #64748b; margin-top: 4px; }
  .overall-score { display: flex; flex-direction: column; align-items: center; margin: 24px 0 16px; }
  .score-ring { position: relative; width: 120px; height: 120px; }
  .score-ring svg { width: 120px; height: 120px; }
  .score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 36px; font-weight: 700; }
  .score-label { font-size: 14px; color: #94a3b8; margin-top: 8px; }
  .summary-bar { display: flex; gap: 12px; justify-content: center; margin: 16px 0; flex-wrap: wrap; }
  .summary-stat { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px 16px; text-align: center; }
  .summary-stat .num { font-size: 20px; font-weight: 700; }
  .summary-stat .lbl { font-size: 11px; color: #94a3b8; }
  .category-card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .category-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .category-score-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
  .category-score-ring svg { width: 80px; height: 80px; }
  .category-score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; font-weight: 700; }
  .category-info h3 { font-size: 16px; margin-bottom: 2px; }
  .category-info p { font-size: 12px; color: #94a3b8; }
  .issue-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .issue-table th { text-align: left; padding: 6px 8px; border-bottom: 1px solid #334155; color: #94a3b8; font-weight: 600; }
  .issue-table td { padding: 8px; border-bottom: 1px solid #1e293b33; vertical-align: top; }
  .severity-badge { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .severity-critical { background: #dc262620; color: #dc2626; }
  .severity-serious { background: #ea580c20; color: #ea580c; }
  .severity-moderate { background: #d9770620; color: #d97706; }
  .severity-minor { background: #2563eb20; color: #2563eb; }
  .severity-info { background: #6b728020; color: #6b7280; }
  .pass-text { color: #22c55e; font-size: 13px; }
  @media print { body { background: #fff; color: #1e293b; } .category-card { border: 1px solid #e2e8f0; } }
</style>
</head>
<body>
<div class="report">
  <div class="header">
    <h1>Full Audit Report</h1>
    <div class="url">${escapeHtml(result.url)}</div>
    <div class="timestamp">${formatDate(result.timestamp)}</div>
    <div class="overall-score">
      <div class="score-ring">
        <svg viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" stroke-width="8"/>
          <circle cx="60" cy="60" r="54" fill="none" stroke="${scoreColor(result.overallScore)}" stroke-width="8"
            stroke-dasharray="${circumference}" stroke-dashoffset="${overallOffset}"
            stroke-linecap="round" transform="rotate(-90 60 60)"/>
        </svg>
        <span class="score-value" style="color:${scoreColor(result.overallScore)}">${result.overallScore}</span>
      </div>
      <div class="score-label">${scoreLabel(result.overallScore)}</div>
    </div>
    <div class="summary-bar">
      <div class="summary-stat"><div class="num">${totalIssues(result)}</div><div class="lbl">Total Issues</div></div>
      <div class="summary-stat"><div class="num" style="color:#ef4444">${criticalCount(result)}</div><div class="lbl">Critical / Serious</div></div>
      <div class="summary-stat"><div class="num">${catEntries.length}</div><div class="lbl">Categories</div></div>
    </div>
  </div>
  ${catCards}
</div>
</body>
</html>`;
}

export function exportAsMarkdown(result: AuditResult): string {
  const lines: string[] = [];
  lines.push('# Full Audit Report');
  lines.push('');
  lines.push(`**URL:** ${result.url}`);
  lines.push(`**Date:** ${formatDate(result.timestamp)}`);
  lines.push(`**Overall Score:** ${result.overallScore}/100`);
  lines.push('');

  const catEntries = Object.entries(result.categories) as [
    string,
    { score: number; issues: AuditIssue[] },
  ][];

  for (const [key, cat] of catEntries) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    lines.push(`## ${label} — ${cat.score}/100`);
    lines.push('');

    if (cat.issues.length === 0) {
      lines.push('All checks passed!');
    } else {
      lines.push('| Severity | Title | Description | Fix |');
      lines.push('|----------|-------|-------------|-----|');
      for (const issue of cat.issues) {
        lines.push(
          `| ${issue.severity} | ${issue.title} | ${issue.description} | ${issue.suggestedFix || '—'} |`,
        );
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function exportAsSARIF(result: AuditResult): string {
  const rules: object[] = [];
  const results: object[] = [];

  let ruleIndex = 0;
  const catEntries = Object.entries(result.categories) as [
    string,
    { score: number; issues: AuditIssue[] },
  ][];

  for (const [category, cat] of catEntries) {
    for (const issue of cat.issues) {
      const ruleId = `fdh/${category}/${ruleIndex}`;
      rules.push({
        id: ruleId,
        shortDescription: { text: issue.title },
        fullDescription: { text: issue.description },
        helpUri: '',
        properties: {
          category,
          severity: issue.severity,
        },
      });

      results.push({
        ruleId,
        ruleIndex,
        level: severityToSARIFLevel(issue.severity),
        message: { text: issue.description },
        locations: issue.selector
          ? [
              {
                physicalLocation: {
                  address: { fullyQualifiedName: result.url },
                  contextRegion: { snippet: { text: issue.selector } },
                },
              },
            ]
          : [],
      });

      ruleIndex++;
    }
  }

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'FDH Full Audit',
            version: '1.0.0',
            informationUri: 'https://github.com/fdh-extension',
            rules,
          },
        },
        results,
        invocations: [
          {
            executionSuccessful: true,
            startTimeUtc: new Date(result.timestamp).toISOString(),
            endTimeUtc: new Date().toISOString(),
          },
        ],
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

export function exportAsJUnit(result: AuditResult): string {
  const catEntries = Object.entries(result.categories) as [
    string,
    { score: number; issues: AuditIssue[] },
  ][];

  const totalTests = catEntries.reduce((sum, [, cat]) => sum + cat.issues.length + 1, 0);
  const totalFailures = catEntries.reduce(
    (sum, [, cat]) =>
      sum +
      cat.issues.filter(
        (i) => i.severity === 'critical' || i.severity === 'serious',
      ).length,
    0,
  );

  const suites = catEntries
    .map(([key, cat]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      const failures = cat.issues.filter(
        (i) => i.severity === 'critical' || i.severity === 'serious',
      ).length;

      const testCases = [
        `<testcase name="score" classname="fdh.${key}" time="0"><system-out>${cat.score}/100</system-out></testcase>`,
        ...cat.issues.map(
          (issue) =>
            `<testcase name="${escapeXml(issue.title)}" classname="fdh.${key}.${issue.severity}" time="0">${
              issue.severity === 'critical' || issue.severity === 'serious'
                ? `<failure message="${escapeXml(issue.description)}">${escapeXml(issue.suggestedFix || '')}</failure>`
                : ''
            }</testcase>`,
        ),
      ].join('\n      ');

      return `  <testsuite name="${escapeXml(label)}" tests="${cat.issues.length + 1}" failures="${failures}" time="0">
      ${testCases}
    </testsuite>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="FDH Full Audit" tests="${totalTests}" failures="${totalFailures}" time="0">
${suites}
</testsuites>`;
}

function severityToSARIFLevel(severity: AuditIssue['severity']): string {
  switch (severity) {
    case 'critical': return 'error';
    case 'serious': return 'error';
    case 'moderate': return 'warning';
    case 'minor': return 'note';
    case 'info': return 'note';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// --- Network Replay Export Functions ---

export interface CapturedRequestForExport {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  statusCode: number;
  statusText: string;
  contentType: string;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  resourceType: string;
  size: number;
  timestamp: number;
}

function shellEscape(str: string): string {
  return `'${str.replace(/'/g, "'\\''")}'`;
}

export function exportAsCurl(request: CapturedRequestForExport): string {
  const parts: string[] = ['curl'];

  if (request.method !== 'GET') {
    parts.push(`-X ${request.method}`);
  }

  for (const [key, value] of Object.entries(request.requestHeaders)) {
    parts.push(`-H ${shellEscape(`${key}: ${value}`)}`);
  }

  if (request.requestBody && request.method !== 'GET' && request.method !== 'HEAD') {
    parts.push(`-d ${shellEscape(request.requestBody)}`);
  }

  parts.push(shellEscape(request.url));

  return parts.join(' \\\n  ');
}

export function exportAsFetch(request: CapturedRequestForExport): string {
  const opts: string[] = [];
  opts.push(`  method: '${request.method}'`);

  const headerKeys = Object.keys(request.requestHeaders);
  if (headerKeys.length > 0) {
    const headersEntries = headerKeys
      .map((key) => `    '${key}': '${request.requestHeaders[key].replace(/'/g, "\\'")}'`)
      .join(',\n');
    opts.push(`  headers: {\n${headersEntries}\n  }`);
  }

  if (request.requestBody && request.method !== 'GET' && request.method !== 'HEAD') {
    opts.push(`  body: ${JSON.stringify(request.requestBody)}`);
  }

  return `fetch('${request.url.replace(/'/g, "\\'")}', {\n${opts.join(',\n')}\n});`;
}

export function exportAsPostmanCollection(requests: CapturedRequestForExport[]): string {
  const items = requests.map((req) => {
    const headerItems = Object.entries(req.requestHeaders).map(([key, value]) => ({
      key,
      value,
    }));

    const item: Record<string, unknown> = {
      name: `${req.method} ${req.url}`,
      request: {
        method: req.method,
        header: headerItems,
        url: {
          raw: req.url,
          host: [req.url],
        },
      },
    };

    if (req.requestBody && req.method !== 'GET' && req.method !== 'HEAD') {
      (item.request as Record<string, unknown>).body = {
        mode: 'raw',
        raw: req.requestBody,
      };
    }

    return item;
  });

  const collection = {
    info: {
      name: 'FDH Network Capture',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
  };

  return JSON.stringify(collection, null, 2);
}
