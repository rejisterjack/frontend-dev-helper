import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement } from '@/content/overlay-manager';

interface RenderRecord {
  componentName: string;
  count: number;
  totalTime: number;
  lastRender: number;
  wastedRenders: number;
}

export const reactRenderTracker: ToolDefinition = {
  id: 'react-render-tracker',
  name: 'React Render Tracker',
  description: 'Detect unnecessary React re-renders and identify performance bottlenecks',
  category: 'performance',
  icon: 'Activity',

  run(ctx) {
    const panel = document.createElement('div');
    panel.style.cssText =
      'position:fixed;top:16px;right:16px;width:380px;max-height:80vh;' +
      'z-index:2147483647;pointer-events:auto;background:#1e1e2e;color:#cdd6f4;' +
      'font-family:system-ui,-apple-system,sans-serif;font-size:13px;border-radius:12px;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #45475a;display:flex;flex-direction:column;';

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'padding:12px 16px;border-bottom:1px solid #45475a;display:flex;justify-content:space-between;align-items:center;';
    const title = document.createElement('span');
    title.style.cssText = 'font-weight:600;font-size:15px;';
    title.textContent = 'React Render Tracker';
    header.appendChild(title);

    const statusBadge = document.createElement('span');
    statusBadge.style.cssText = 'font-size:11px;color:#6c7086;';
    statusBadge.textContent = 'Initializing...';
    header.appendChild(statusBadge);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = 'background:#45475a;color:#cdd6f4;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;';
    header.appendChild(closeButton);
    panel.appendChild(header);

    // Controls
    const controls = document.createElement('div');
    controls.style.cssText = 'padding:8px 16px;border-bottom:1px solid #313244;display:flex;gap:8px;';

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'background:#45475a;color:#cdd6f4;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;';
    controls.appendChild(clearBtn);

    const highlightToggle = document.createElement('button');
    highlightToggle.textContent = 'Highlight Renders';
    highlightToggle.style.cssText = 'background:#6366f1;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:11px;';
    controls.appendChild(highlightToggle);

    panel.appendChild(controls);

    // Content
    const content = document.createElement('div');
    content.style.cssText = 'flex:1;overflow-y:auto;padding:8px 0;';
    panel.appendChild(content);

    addOverlayElement(panel);

    // ---- Render tracking logic ----
    const renderMap = new Map<string, RenderRecord>();
    const renderLog: Array<{ name: string; time: number; duration: number }> = [];
    let highlightEnabled = true;
    let tracking = false;
    let totalRenders = 0;

    // Hook into React's devtools global hook
    function startTracking(): boolean {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) {
        statusBadge.textContent = 'React DevTools not found';
        statusBadge.style.color = '#f38ba8';
        return false;
      }

      try {
        // Track fiber commits
        hook.onCommitFiberRoot = ((original: any) => {
          return (rendererID: number, root: any, ...args: any[]) => {
            if (original) {
              try { original(rendererID, root, ...args); } catch {}
            }

            // Walk the fiber tree and find components that re-rendered
            const now = performance.now();
            walkFiberTree(root, now);
          };
        })(hook.onCommitFiberRoot);

        tracking = true;
        statusBadge.textContent = 'Tracking';
        statusBadge.style.color = '#a6e3a1';
        renderContent();
        return true;
      } catch {
        statusBadge.textContent = 'Hook failed';
        statusBadge.style.color = '#f38ba8';
        return false;
      }
    }

    function walkFiberTree(fiber: any, timestamp: number): void {
      if (!fiber) return;

      if (fiber.type && typeof fiber.type === 'function' && fiber.type.name) {
        const name = fiber.type.displayName || fiber.type.name;
        if (name && !name.startsWith('_') && name !== 'Fragment') {
          const record = renderMap.get(name) || {
            componentName: name,
            count: 0,
            totalTime: 0,
            lastRender: 0,
            wastedRenders: 0,
          };

          record.count++;
          record.lastRender = timestamp;

          // Detect potential wasted render: same props/state
          if (fiber.memoizedProps && fiber.alternate?.memoizedProps) {
            const prevProps = fiber.alternate.memoizedProps;
            const currProps = fiber.memoizedProps;
            if (shallowEqual(prevProps, currProps)) {
              record.wastedRenders++;
            }
          }

          renderMap.set(name, record);
          totalRenders++;

          renderLog.push({ name, time: timestamp, duration: 0 });
          if (renderLog.length > 500) renderLog.shift();

          // Highlight on page if enabled
          if (highlightEnabled && fiber.stateNode instanceof HTMLElement) {
            flashElement(fiber.stateNode);
          }
        }
      }

      if (fiber.child) walkFiberTree(fiber.child, timestamp);
      if (fiber.sibling) walkFiberTree(fiber.sibling, timestamp);
    }

    function shallowEqual(a: any, b: any): boolean {
      if (a === b) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (a[key] !== b[key]) return false;
      }
      return true;
    }

    function flashElement(el: HTMLElement): void {
      el.style.outline = '2px solid #f38ba8';
      el.style.outlineOffset = '2px';
      setTimeout(() => {
        el.style.outline = '';
        el.style.outlineOffset = '';
      }, 300);
    }

    function renderContent(): void {
      while (content.firstChild) content.removeChild(content.firstChild);

      if (!tracking) {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:16px;text-align:center;color:#6c7086;';
        msg.textContent = 'React not detected. Open a React app in development mode.';
        content.appendChild(msg);
        return;
      }

      if (renderMap.size === 0) {
        const msg = document.createElement('div');
        msg.style.cssText = 'padding:16px;text-align:center;color:#6c7086;';
        msg.textContent = 'Waiting for renders... Interact with the page.';
        content.appendChild(msg);
        return;
      }

      // Summary
      const summary = document.createElement('div');
      summary.style.cssText = 'padding:4px 16px 8px;color:#6c7086;font-size:11px;display:flex;justify-content:space-between;';
      const leftSpan = document.createElement('span');
      leftSpan.textContent = `${totalRenders} renders across ${renderMap.size} components`;
      summary.appendChild(leftSpan);
      content.appendChild(summary);

      // Sort by render count descending
      const sorted = [...renderMap.values()].sort((a, b) => b.count - a.count);

      for (const record of sorted.slice(0, 30)) {
        const row = document.createElement('div');
        row.style.cssText = 'padding:6px 16px;border-bottom:1px solid #313244;';

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = 'font-weight:500;color:#89b4fa;font-size:12px;';
        nameSpan.textContent = record.componentName;

        const countSpan = document.createElement('span');
        const isWasteful = record.wastedRenders > record.count * 0.3;
        countSpan.style.cssText = `font-size:11px;color:${isWasteful ? '#f38ba8' : '#a6adc8'};`;
        countSpan.textContent = `${record.count} renders`;

        topRow.appendChild(nameSpan);
        topRow.appendChild(countSpan);
        row.appendChild(topRow);

        // Wasted render warning
        if (record.wastedRenders > 0) {
          const warning = document.createElement('div');
          warning.style.cssText = 'font-size:10px;color:#f38ba8;margin-top:2px;';
          warning.textContent = `${record.wastedRenders} potential wasted render${record.wastedRenders !== 1 ? 's' : ''} (same props)`;
          row.appendChild(warning);
        }

        // Render count bar
        const barContainer = document.createElement('div');
        barContainer.style.cssText = 'margin-top:4px;height:3px;background:#313244;border-radius:2px;';
        const bar = document.createElement('div');
        const maxCount = sorted[0]?.count || 1;
        const barWidth = Math.max(2, (record.count / maxCount) * 100);
        bar.style.cssText = `height:100%;width:${barWidth}%;background:${isWasteful ? '#f38ba8' : '#6366f1'};border-radius:2px;`;
        barContainer.appendChild(bar);
        row.appendChild(barContainer);

        content.appendChild(row);
      }
    }

    // Initialize
    const reactDetected = startTracking();
    if (!reactDetected) {
      // Try again after a delay (React may load async)
      setTimeout(() => {
        if (!tracking) startTracking();
      }, 2000);
    }

    // Event listeners
    clearBtn.addEventListener('click', () => {
      renderMap.clear();
      renderLog.length = 0;
      totalRenders = 0;
      renderContent();
    });

    let isHighlighting = true;
    highlightToggle.addEventListener('click', () => {
      isHighlighting = !isHighlighting;
      highlightEnabled = isHighlighting;
      highlightToggle.textContent = isHighlighting ? 'Highlight Renders' : 'No Highlight';
      highlightToggle.style.background = isHighlighting ? '#6366f1' : '#45475a';
    });

    // Periodic UI update
    const updateInterval = setInterval(() => {
      if (tracking) renderContent();
    }, 2000);

    let disposed = false;
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      clearInterval(updateInterval);
      removeOverlayElement(panel);
    };

    closeButton.addEventListener('click', cleanup);
    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
