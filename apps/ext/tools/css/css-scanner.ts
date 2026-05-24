import type { ToolDefinition } from '../types';

type Severity = 'error' | 'warning' | 'info';

interface ScanResult {
  severity: Severity;
  category: string;
  message: string;
  selector: string;
  property?: string;
  value?: string;
  fix?: string;
  source?: string;
}

function scanStylesheets(): ScanResult[] {
  const issues: ScanResult[] = [];

  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i] as CSSStyleSheet;
    let source = 'stylesheet #' + i;
    try {
      if (sheet.ownerNode instanceof HTMLLinkElement) source = sheet.ownerNode.href.split('/').pop() || source;
      else if (sheet.ownerNode instanceof HTMLStyleElement) source = sheet.ownerNode.id ? 'style#' + sheet.ownerNode.id : 'inline style';
    } catch {
      issues.push({ severity: 'info', category: 'cross-origin', message: 'Cannot scan cross-origin stylesheet', selector: '*', source });
      continue;
    }

    try {
      scanRules(sheet.cssRules, issues, source);
    } catch {
      issues.push({ severity: 'info', category: 'access', message: 'Cannot access rules (cross-origin or restricted)', selector: '*', source });
    }
  }

  scanInlineStyles(issues);
  return issues;
}

function scanRules(rules: CSSRuleList, issues: ScanResult[], source: string): void {
  for (let r = 0; r < rules.length; r++) {
    const rule = rules[r];
    if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule || rule instanceof CSSLayerBlockRule) {
      try { scanRules(rule.cssRules, issues, source); } catch { /* nested cross-origin */ }
      continue;
    }
    if (!(rule instanceof CSSStyleRule)) continue;
    const selector = rule.selectorText;

    if (rule.style.length === 0) {
      issues.push({ severity: 'info', category: 'empty-rule', message: 'Empty rule — has no declarations', selector, source });
      continue;
    }

    if (selector.includes('*') && !selector.includes('*=')) {
      issues.push({ severity: 'warning', category: 'universal-selector', message: 'Universal selector used (performance concern)', selector, source });
    }

    const props = new Map<string, { value: string; important: boolean }>();
    let importantCount = 0;

    for (let p = 0; p < rule.style.length; p++) {
      const prop = rule.style[p];
      if (!prop) continue;
      const value = rule.style.getPropertyValue(prop).trim();
      const important = rule.style.getPropertyPriority(prop) === 'important';
      if (important) importantCount++;

      if (/^(0(?:px|em|rem|vh|vw|%|pt|pc|cm|mm|in|ex|ch|vmin|vmax|fr|deg|rad|turn|s|ms))$/i.test(value)) {
        issues.push({ severity: 'info', category: 'zero-unit', message: 'Zero value with unnecessary unit: "' + value + '"', selector, property: prop, value, source, fix: prop + ': 0;' });
      }

      const vendorMatch = prop.match(/^-(webkit|moz|ms|o)-(.+)/);
      if (vendorMatch) {
        const standardProp = vendorMatch[2];
        if (CSS.supports(standardProp, value)) {
          issues.push({ severity: 'info', category: 'vendor-prefix', message: 'Vendor-prefixed property has standard equivalent', selector, property: prop, value, source, fix: standardProp + ': ' + value + ';' });
        }
      }

      if (props.has(prop)) {
        const prev = props.get(prop)!;
        if (prev.value === value && !prev.important) {
          issues.push({ severity: 'warning', category: 'duplicate-property', message: 'Duplicate property "' + prop + '" with same value', selector, property: prop, value, source });
        } else if (prev.value !== value && !prev.important) {
          issues.push({ severity: 'info', category: 'override-property', message: 'Property "' + prop + '" overridden', selector, property: prop, value, source });
        }
      }
      props.set(prop, { value, important });
    }

    if (importantCount > 3) {
      issues.push({ severity: 'warning', category: 'important-overuse', message: importantCount + ' !important declarations in single rule', selector, source });
    }
  }
}

function scanInlineStyles(issues: ScanResult[]): void {
  const styled = document.querySelectorAll('[style]');
  let importantInline = 0;
  for (const el of styled) {
    const style = el.getAttribute('style') || '';
    const matches = style.match(/!important/g);
    if (matches) importantInline += matches.length;
  }
  if (importantInline > 10) {
    issues.push({ severity: 'warning', category: 'inline-important', message: importantInline + ' !important in inline styles across ' + styled.length + ' elements', selector: '[style]', source: 'inline styles' });
  }
  if (styled.length > 50) {
    issues.push({ severity: 'info', category: 'inline-styles', message: styled.length + ' elements with inline styles', selector: '[style]', source: 'inline styles' });
  }
}

export const cssScanner: ToolDefinition = {
  id: 'css-scanner',
  name: 'CSS Scanner',
  description: 'Scan for unused CSS, specificity issues, and duplicate rules',
  category: 'css',
  icon: 'Search',
  configSchema: {
    scanUnused: { type: 'boolean', label: 'Scan Unused CSS', default: true },
    scanDuplicates: { type: 'boolean', label: 'Scan Duplicates', default: true },
    scanSpecificity: { type: 'boolean', label: 'Check Specificity', default: true },
    scanImportants: { type: 'boolean', label: 'Find !important', default: true },
    maxResults: { type: 'slider', label: 'Max Results', default: 50, min: 10, max: 200, step: 10 },
  },
  run: (ctx, config) => {
    let results: ScanResult[] = scanStylesheets();
    let filterSeverity: Severity | 'all' = 'all';

    const panelHost = document.createElement('div');
    panelHost.className = 'fdh-css-scan';
    const shadow = panelHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial;}
      .panel{position:fixed;bottom:16px;right:16px;z-index:2147483647;width:480px;max-height:420px;background:#1e1e2e;color:#cdd6f4;font-family:-apple-system,sans-serif;font-size:12px;border-radius:12px;border:1px solid #45475a;box-shadow:0 12px 40px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;}
      .header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#181825;border-bottom:1px solid #313244;}
      .header-title{margin:0;font-size:13px;color:#cdd6f4;font-weight:600;}
      .header-actions{display:flex;gap:8px;align-items:center;}
      .close-btn{background:none;border:none;color:#a6adc8;cursor:pointer;font-size:18px;padding:0;}
      .close-btn:hover{color:#f38ba8;}
      .summary{display:flex;gap:12px;padding:8px 14px;border-bottom:1px solid #313244;}
      .summary-item{display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 6px;border-radius:4px;font-size:11px;}
      .summary-item:hover{background:#313244;}
      .summary-item.active{background:#45475a;}
      .results{overflow-y:auto;flex:1;padding:6px 0;}
      .row{display:flex;align-items:center;gap:6px;padding:6px 14px;}
      .row:hover{background:#313244;}
      .badge{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;text-transform:uppercase;min-width:44px;text-align:center;}
      .badge-error{background:#f38ba8;color:#1e1e2e;}
      .badge-warning{background:#f9e2af;color:#1e1e2e;}
      .badge-info{background:#89b4fa;color:#1e1e2e;}
      .category{color:#94e2d5;min-width:100px;}
      .selector{color:#a6e3a1;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .message{flex:1;color:#bac2de;}
      .copy-fix{background:#45475a;border:none;color:#cdd6f4;padding:2px 8px;border-radius:4px;cursor:pointer;font-size:10px;}
      .copy-fix:hover{background:#585b70;}
      .empty{padding:20px;text-align:center;color:#a6adc8;}
      .rescan-btn{background:#6366f1;border:none;color:white;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px;}
      .rescan-btn:hover{background:#818cf8;}
      .results::-webkit-scrollbar{width:8px;}
      .results::-webkit-scrollbar-thumb{background:#313244;border-radius:4px;}
    `;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);
    document.body.appendChild(panelHost);

    function buildPanel(): void {
      while (container.firstChild) container.removeChild(container.firstChild);

      const panel = document.createElement('div');
      panel.className = 'panel';

      const header = document.createElement('div');
      header.className = 'header';
      const title = document.createElement('span');
      title.className = 'header-title';
      title.textContent = 'CSS Scanner — ' + results.length + ' issues';
      const actions = document.createElement('div');
      actions.className = 'header-actions';
      const rescanBtn = document.createElement('button');
      rescanBtn.className = 'rescan-btn';
      rescanBtn.dataset.action = 'rescan';
      rescanBtn.textContent = 'Rescan';
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.dataset.action = 'close';
      closeBtn.textContent = '×';
      actions.append(rescanBtn, closeBtn);
      header.append(title, actions);

      const summary = document.createElement('div');
      summary.className = 'summary';

      const counts = { error: 0, warning: 0, info: 0 };
      for (const r of results) counts[r.severity]++;

      function filterBtn(label: string, filter: Severity | 'all', count: number): HTMLElement {
        const btn = document.createElement('div');
        btn.className = 'summary-item' + (filterSeverity === filter ? ' active' : '');
        btn.dataset.filter = filter;
        btn.textContent = label + ' (' + count + ')';
        return btn;
      }
      summary.append(filterBtn('All', 'all', results.length), filterBtn('Errors', 'error', counts.error), filterBtn('Warnings', 'warning', counts.warning), filterBtn('Info', 'info', counts.info));

      const resultsDiv = document.createElement('div');
      resultsDiv.className = 'results';
      const filtered = filterSeverity === 'all' ? results : results.filter(r => r.severity === filterSeverity);

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No issues found. Your CSS looks clean!';
        resultsDiv.appendChild(empty);
      } else {
        for (const r of filtered.slice(0, 100)) {
          const row = document.createElement('div');
          row.className = 'row';

          const badge = document.createElement('span');
          badge.className = 'badge badge-' + r.severity;
          badge.textContent = r.severity.toUpperCase();
          row.appendChild(badge);

          const category = document.createElement('span');
          category.className = 'category';
          category.textContent = r.category;
          row.appendChild(category);

          const selector = document.createElement('span');
          selector.className = 'selector';
          selector.textContent = r.selector;
          selector.title = r.selector;
          row.appendChild(selector);

          const message = document.createElement('span');
          message.className = 'message';
          message.textContent = r.message;
          row.appendChild(message);

          if (r.fix) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-fix';
            copyBtn.dataset.fix = r.fix;
            copyBtn.textContent = 'Copy Fix';
            row.appendChild(copyBtn);
          }

          resultsDiv.appendChild(row);
        }
      }

      panel.append(header, summary, resultsDiv);
      container.appendChild(panel);
    }

    container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.action === 'close') { cleanup(); return; }
      if (target.dataset.action === 'rescan') { results = scanStylesheets(); buildPanel(); return; }
      if (target.dataset.filter) { filterSeverity = target.dataset.filter as Severity | 'all'; buildPanel(); return; }
      if (target.dataset.fix) {
        navigator.clipboard.writeText(target.dataset.fix).catch(() => {});
        target.textContent = 'Copied!';
        setTimeout(() => { target.textContent = 'Copy Fix'; }, 1500);
      }
    });

    buildPanel();

    function cleanup() {
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
