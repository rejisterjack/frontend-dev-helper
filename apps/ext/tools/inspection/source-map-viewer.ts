import type { ToolDefinition } from '../types';
import { getOverlayContainer } from '@/content/overlay-manager';
import { ToolPanel, createBadge, createButton } from '@/content/tool-panel';
import {
  findSourceMapUrls,
  enrichSourceMapInfo,
  resolvePosition,
  getSourceContent,
  clearCache,
  type SourceMapInfo,
} from '@/lib/source-map-resolver';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrichedInfo extends SourceMapInfo {
  verified: boolean;
  fetchError?: string;
}

// ---------------------------------------------------------------------------
// Style constants
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#0f172a',
  bgLight: '#1e293b',
  bgLighter: '#334155',
  bgDarkest: '#0c1222',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  accent: '#3b82f6',
  accentOrange: '#f97316',
  accentRed: '#ef4444',
  border: '#334155',
  success: '#22c55e',
};

// ---------------------------------------------------------------------------
// UI builders
// ---------------------------------------------------------------------------

function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function createSectionHeader(text: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    font-size: 11px;
    font-weight: 600;
    color: ${COLORS.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 8px 0 4px;
    border-bottom: 1px solid ${COLORS.border};
    margin-bottom: 6px;
  `;
  el.textContent = text;
  return el;
}

function createFileRow(
  label: string,
  value: string,
  onClick?: () => void,
): HTMLDivElement {
  const row = document.createElement('div');
  row.style.cssText = `
    display: flex;
    align-items: center;
    padding: 6px 8px;
    border-radius: 4px;
    background: ${COLORS.bgLight};
    margin-bottom: 2px;
    font-size: 11px;
    cursor: ${onClick ? 'pointer' : 'default'};
    gap: 8px;
  `;

  if (onClick) {
    row.addEventListener('mouseenter', () => { row.style.background = COLORS.bgLighter; });
    row.addEventListener('mouseleave', () => { row.style.background = COLORS.bgLight; });
    row.addEventListener('click', onClick);
  }

  const labelText = document.createElement('span');
  labelText.style.cssText = `color: ${COLORS.textMuted}; min-width: 60px; flex-shrink: 0;`;
  labelText.textContent = label;
  row.appendChild(labelText);

  const valueText = document.createElement('span');
  valueText.style.cssText = `color: ${COLORS.text}; font-family: 'SF Mono', 'Fira Code', monospace; word-break: break-all; flex: 1;`;
  valueText.textContent = value;
  row.appendChild(valueText);

  return row;
}

function createCodeBlock(content: string): HTMLPreElement {
  const pre = document.createElement('pre');
  pre.style.cssText = `
    background: ${COLORS.bgDarkest};
    border: 1px solid ${COLORS.border};
    border-radius: 6px;
    padding: 8px;
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: ${COLORS.text};
    overflow-x: auto;
    max-height: 300px;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 4px 0;
  `;
  pre.textContent = content;
  return pre;
}

function createEmptyState(message: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    padding: 32px 16px;
    text-align: center;
    color: ${COLORS.textDim};
    font-size: 13px;
  `;
  el.textContent = message;
  return el;
}

function createLoadingSpinner(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    color: ${COLORS.textMuted};
    font-size: 12px;
  `;
  el.textContent = 'Scanning for source maps...';
  return el;
}

function createResultContainer(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'margin-top: 4px;';
  return el;
}

function createStyledInput(
  placeholder: string,
  type: string = 'text',
  width: string = '80px',
): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  input.style.cssText = `
    width: ${width};
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid ${COLORS.border};
    background: ${COLORS.bgLight};
    color: ${COLORS.text};
    font-size: 12px;
    font-family: inherit;
    outline: none;
  `;
  input.addEventListener('focus', () => { input.style.borderColor = COLORS.accent; });
  input.addEventListener('blur', () => { input.style.borderColor = COLORS.border; });
  return input;
}

// ---------------------------------------------------------------------------
// Main tool
// ---------------------------------------------------------------------------

export const sourceMapViewer: ToolDefinition = {
  id: 'source-map-viewer',
  name: 'Source Map Viewer',
  description: 'Resolve minified code to original sources using source maps',
  category: 'inspection',
  icon: 'Map',
  configSchema: {
    autoScan: { type: 'boolean', label: 'Auto Scan', default: true },
    showContent: { type: 'boolean', label: 'Show Source Content', default: true },
    maxFileSize: { type: 'slider', label: 'Max File Size (KB)', default: 500, min: 100, max: 2000, step: 100 },
  },

  run(ctx, config) {
    const showContent = (config?.showContent ?? true) as boolean;
    const maxFileSize = (config?.maxFileSize ?? 500) as number;

    const { shadow } = getOverlayContainer();

    // --- State ---
    let disposed = false;
    let enrichedInfos: EnrichedInfo[] = [];

    // --- Panel ---
    const panel = new ToolPanel({
      title: 'Source Map Viewer',
      width: 480,
      onClose: () => cleanup(),
    });
    panel.mount(shadow);

    const contentArea = panel.getContainer();

    // --- Views ---
    function showLoading(): void {
      clearChildren(contentArea);
      contentArea.appendChild(createLoadingSpinner());
    }

    function showFileList(): void {
      clearChildren(contentArea);

      // Summary badges
      const summary = document.createElement('div');
      summary.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;';

      const verified = enrichedInfos.filter((i) => i.verified).length;
      const total = enrichedInfos.length;

      summary.appendChild(createBadge(`${verified} Available`, COLORS.success));
      summary.appendChild(createBadge(`${total} Total`, COLORS.accent));
      contentArea.appendChild(summary);

      // Rescan button
      const rescanBtn = createButton('Rescan', () => {
        clearCache();
        scan();
      }, 'secondary');
      rescanBtn.style.marginBottom = '8px';
      contentArea.appendChild(rescanBtn);

      contentArea.appendChild(createSectionHeader('Files with Source Maps'));

      if (enrichedInfos.length === 0) {
        contentArea.appendChild(createEmptyState('No source maps found on this page.'));
        return;
      }

      for (const info of enrichedInfos) {
        const row = document.createElement('div');
        row.style.cssText = `
          padding: 8px 10px;
          border-radius: 6px;
          background: ${COLORS.bgLight};
          margin-bottom: 4px;
          cursor: pointer;
          border-left: 3px solid ${info.verified ? COLORS.success : COLORS.accentRed};
          transition: background 0.15s;
        `;
        row.addEventListener('mouseenter', () => { row.style.background = COLORS.bgLighter; });
        row.addEventListener('mouseleave', () => { row.style.background = COLORS.bgLight; });

        // Top row: file name + badge
        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:2px;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-size:12px;font-weight:500;color:${COLORS.text};flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        nameSpan.textContent = getFileName(info.url);
        nameSpan.title = info.url;
        topRow.appendChild(nameSpan);

        if (info.verified) {
          topRow.appendChild(createBadge(`${info.sources.length} sources`, COLORS.accent));
        } else {
          topRow.appendChild(createBadge('Unavailable', COLORS.accentRed));
        }

        row.appendChild(topRow);

        // Subtitle: URL path
        const subtitle = document.createElement('div');
        subtitle.style.cssText = `font-size:10px;color:${COLORS.textDim};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        subtitle.textContent = info.sourceMapUrl;
        subtitle.title = info.sourceMapUrl;
        row.appendChild(subtitle);

        if (info.fetchError) {
          const errText = document.createElement('div');
          errText.style.cssText = `font-size:10px;color:${COLORS.accentRed};margin-top:2px;`;
          errText.textContent = info.fetchError;
          row.appendChild(errText);
        }

        if (info.verified) {
          row.addEventListener('click', () => showFileDetail(info));
        }

        contentArea.appendChild(row);
      }
    }

    function showFileDetail(info: EnrichedInfo): void {
      clearChildren(contentArea);

      // Back button
      const backBtn = createButton('< Back to list', () => showFileList(), 'secondary');
      backBtn.style.marginBottom = '8px';
      contentArea.appendChild(backBtn);

      // File info
      contentArea.appendChild(createSectionHeader('Generated File'));
      contentArea.appendChild(createFileRow('URL', info.url));

      contentArea.appendChild(createSectionHeader('Source Map'));
      contentArea.appendChild(createFileRow('URL', info.sourceMapUrl));

      // Original sources list
      contentArea.appendChild(createSectionHeader('Original Sources'));

      for (const source of info.sources) {
        const srcRow = document.createElement('div');
        srcRow.style.cssText = `
          padding: 6px 8px;
          border-radius: 4px;
          background: ${COLORS.bgLight};
          margin-bottom: 2px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          transition: background 0.15s;
        `;
        srcRow.addEventListener('mouseenter', () => { srcRow.style.background = COLORS.bgLighter; });
        srcRow.addEventListener('mouseleave', () => { srcRow.style.background = COLORS.bgLight; });

        const srcName = document.createElement('span');
        srcName.style.cssText = `color:${COLORS.text};font-family:'SF Mono','Fira Code',monospace;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
        srcName.textContent = source;
        srcName.title = source;
        srcRow.appendChild(srcName);

        const viewBtn = document.createElement('span');
        viewBtn.style.cssText = `color:${COLORS.accent};font-size:10px;flex-shrink:0;`;
        viewBtn.textContent = 'View';
        srcRow.appendChild(viewBtn);

        srcRow.addEventListener('click', () => showSourceContent(info, source));
        contentArea.appendChild(srcRow);
      }

      // Position resolver
      contentArea.appendChild(createSectionHeader('Resolve Position'));

      const resolverBox = document.createElement('div');
      resolverBox.style.cssText = `
        background: ${COLORS.bgDarkest};
        border: 1px solid ${COLORS.border};
        border-radius: 6px;
        padding: 8px;
      `;

      const inputRow = document.createElement('div');
      inputRow.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';

      const lineInput = createStyledInput('Line', 'number');
      inputRow.appendChild(lineInput);

      const colInput = createStyledInput('Column', 'number');
      inputRow.appendChild(colInput);

      const resolveResult = createResultContainer();

      const resolveBtn = createButton('Resolve', () => {
        const line = parseInt(lineInput.value, 10);
        const col = parseInt(colInput.value, 10);
        if (isNaN(line) || isNaN(col)) return;
        resolveAndShow(resolveResult, info, line, col);
      }, 'primary');
      inputRow.appendChild(resolveBtn);

      resolverBox.appendChild(inputRow);
      resolverBox.appendChild(resolveResult);

      contentArea.appendChild(resolverBox);
    }

    async function resolveAndShow(
      resultEl: HTMLDivElement,
      info: EnrichedInfo,
      line: number,
      col: number,
    ): Promise<void> {
      clearChildren(resultEl);

      const loading = document.createElement('div');
      loading.style.cssText = `color:${COLORS.textMuted};font-size:11px;padding:4px 0;`;
      loading.textContent = 'Resolving...';
      resultEl.appendChild(loading);

      try {
        const resolved = await resolvePosition(info.sourceMapUrl, line, col);
        clearChildren(resultEl);

        if (resolved) {
          const resolvedRow = document.createElement('div');
          resolvedRow.style.cssText = `
            padding: 6px 8px;
            border-radius: 4px;
            background: ${COLORS.success}15;
            border-left: 3px solid ${COLORS.success};
            font-size: 11px;
          `;

          const posText = document.createElement('div');
          posText.style.cssText = `color:${COLORS.text};font-family:'SF Mono','Fira Code',monospace;`;
          posText.textContent = `${resolved.source}:${resolved.line}:${resolved.column}`;
          resolvedRow.appendChild(posText);

          if (resolved.name) {
            const nameText = document.createElement('div');
            nameText.style.cssText = `color:${COLORS.accentOrange};font-size:10px;margin-top:2px;`;
            nameText.textContent = `name: ${resolved.name}`;
            resolvedRow.appendChild(nameText);
          }

          resultEl.appendChild(resolvedRow);
        } else {
          const noResult = document.createElement('div');
          noResult.style.cssText = `color:${COLORS.accentOrange};font-size:11px;padding:4px 0;`;
          noResult.textContent = 'No mapping found for this position.';
          resultEl.appendChild(noResult);
        }
      } catch (err) {
        clearChildren(resultEl);
        const errEl = document.createElement('div');
        errEl.style.cssText = `color:${COLORS.accentRed};font-size:11px;padding:4px 0;`;
        errEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
        resultEl.appendChild(errEl);
      }
    }

    async function showSourceContent(info: EnrichedInfo, sourceFile: string): Promise<void> {
      clearChildren(contentArea);

      const backBtn = createButton('< Back to file', () => showFileDetail(info), 'secondary');
      backBtn.style.marginBottom = '8px';
      contentArea.appendChild(backBtn);

      contentArea.appendChild(createSectionHeader('Source Content'));
      contentArea.appendChild(createFileRow('File', sourceFile));

      if (!showContent) {
        const note = document.createElement('div');
        note.style.cssText = `color:${COLORS.textDim};font-size:11px;padding:8px 0;`;
        note.textContent = 'Source content display is disabled in config.';
        contentArea.appendChild(note);
        return;
      }

      const loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = `color:${COLORS.textMuted};font-size:11px;padding:8px 0;`;
      loadingDiv.textContent = 'Loading source content...';
      contentArea.appendChild(loadingDiv);

      try {
        const content = await getSourceContent(info.sourceMapUrl, sourceFile);

        // Remove loading
        loadingDiv.remove();

        if (content !== null) {
          const sizeKB = Math.round(new Blob([content]).size / 1024);
          const sizeInfo = document.createElement('div');
          sizeInfo.style.cssText = `color:${COLORS.textDim};font-size:10px;margin-bottom:4px;`;
          sizeInfo.textContent = `${content.split('\n').length} lines, ${sizeKB} KB`;
          contentArea.appendChild(sizeInfo);

          if (sizeKB > maxFileSize) {
            const warning = document.createElement('div');
            warning.style.cssText = `color:${COLORS.accentOrange};font-size:11px;padding:8px 0;`;
            warning.textContent = `File exceeds max display size (${maxFileSize} KB). Showing first 500 lines.`;
            contentArea.appendChild(warning);
            contentArea.appendChild(createCodeBlock(content.split('\n').slice(0, 500).join('\n')));
          } else {
            contentArea.appendChild(createCodeBlock(content));
          }
        } else {
          contentArea.appendChild(createEmptyState('Source content not embedded in the source map.'));
        }
      } catch (err) {
        loadingDiv.remove();
        const errEl = document.createElement('div');
        errEl.style.cssText = `color:${COLORS.accentRed};font-size:11px;padding:8px 0;`;
        errEl.textContent = `Error loading content: ${err instanceof Error ? err.message : String(err)}`;
        contentArea.appendChild(errEl);
      }
    }

    // --- Scanning ---
    async function scan(): Promise<void> {
      showLoading();

      const rawInfos = findSourceMapUrls();
      const results: EnrichedInfo[] = [];

      for (const raw of rawInfos) {
        try {
          const enriched = await enrichSourceMapInfo(raw);
          if (enriched) {
            results.push({ ...enriched, verified: true });
          } else {
            results.push({ ...raw, verified: false, fetchError: 'Source map not found or invalid' });
          }
        } catch (err) {
          results.push({
            ...raw,
            verified: false,
            fetchError: err instanceof Error ? err.message : String(err),
          });
        }
      }

      enrichedInfos = results;

      if (!disposed) {
        showFileList();
      }
    }

    // --- Start ---
    scan();

    // --- Cleanup ---
    function cleanup() {
      if (disposed) return;
      disposed = true;
      clearCache();
      panel.destroy();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/');
    return parts[parts.length - 1] || pathname;
  } catch {
    return url;
  }
}
