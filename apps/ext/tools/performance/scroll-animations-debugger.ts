import type { ToolDefinition } from '../types';

export const scrollAnimationsDebugger: ToolDefinition = {
  id: 'scroll-animations-debugger',
  name: 'Scroll Animations Debugger',
  description: 'Debug scroll-driven animations and scroll-linked effects',
  category: 'performance',
  icon: 'ArrowDown',
  configSchema: {
    showScrollTimeline: { type: 'boolean', label: 'Show Scroll Timeline', default: true },
    showProgress: { type: 'boolean', label: 'Show Progress', default: true },
    freezeScroll: { type: 'boolean', label: 'Freeze Scroll', default: false },
    highlightTriggers: { type: 'boolean', label: 'Highlight Triggers', default: true },
  },
  run: (ctx, config) => {
    const cfg = config ?? {};
    const showTimeline = (cfg.showScrollTimeline as boolean) ?? true;
    const showProgress = (cfg.showProgress as boolean) ?? true;
    const freezeScroll = (cfg.freezeScroll as boolean) ?? false;
    const highlightTriggers = (cfg.highlightTriggers as boolean) ?? true;

    const overlays: HTMLElement[] = [];
    let disposed = false;

    if (freezeScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Progress bar at top of viewport
    let progressBar: HTMLElement | null = null;
    if (showProgress) {
      progressBar = document.createElement('div');
      progressBar.style.cssText = 'position:fixed;top:0;left:0;width:0%;height:3px;z-index:2147483646;' +
        'background:linear-gradient(90deg,#3b82f6,#a855f7);transition:width .1s ease;pointer-events:none;';
      addOverlayElement(progressBar);
      overlays.push(progressBar);
    }

    // Timeline panel
    let timelinePanel: HTMLElement | null = null;
    if (showTimeline) {
      timelinePanel = document.createElement('div');
      timelinePanel.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;' +
        'background:#0f172a;border:1px solid #334155;border-radius:8px;padding:8px 16px;' +
        'font-family:system-ui,sans-serif;color:#e2e8f0;font-size:12px;display:flex;align-items:center;gap:12px;box-shadow:0 4px 12px rgba(0,0,0,.4);';
      const title = document.createElement('span');
      title.style.cssText = 'font-weight:600;';
      title.textContent = 'Scroll Debugger';
      const scrollPct = document.createElement('span');
      scrollPct.style.cssText = 'color:#94a3b8;';
      scrollPct.textContent = '0%';
      const closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;';
      closeBtn.textContent = '×';
      closeBtn.onclick = cleanup;
      timelinePanel.append(title, scrollPct, closeBtn);
      addOverlayElement(timelinePanel);
      overlays.push(timelinePanel);

      const updateScroll = () => {
        if (disposed) return;
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
        scrollPct.textContent = pct + '%';
        if (progressBar) progressBar.style.width = pct + '%';
      };
      window.addEventListener('scroll', updateScroll, { passive: true });
      overlays.push(null as any); // placeholder for cleanup
      const origCleanup = cleanup;
      cleanup = () => {
        window.removeEventListener('scroll', updateScroll);
        origCleanup();
      };
    }

    // Find scroll-animated elements
    if (highlightTriggers) {
      const allEls = document.querySelectorAll('*');
      const animatedEls: HTMLElement[] = [];

      allEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const style = window.getComputedStyle(htmlEl);

        // Check for scroll-driven animations
        const animName = style.animationName;
        const timeline = style.getPropertyValue('animation-timeline') ||
          style.getPropertyValue('scroll-timeline') ||
          htmlEl.style.getPropertyValue('animation-timeline') ||
          htmlEl.style.getPropertyValue('scroll-timeline');

        // Check for CSS scroll-driven properties
        const viewTimeline = htmlEl.style.getPropertyValue('view-timeline') ||
          style.getPropertyValue('view-timeline');
        const scrollBehavior = style.scrollBehavior;

        // Check for position:sticky (common scroll effect)
        const isSticky = style.position === 'sticky';

        // Check for IntersectionObserver-driven effects (heuristic: opacity:0 elements that are children of scroll containers)
        const hasTransform = style.transform !== 'none';
        const hasOpacityAnim = style.transition?.includes('opacity') || style.transition?.includes('transform');

        if (timeline || viewTimeline || (animName !== 'none' && animName !== 'initial') || (isSticky && hasTransform)) {
          animatedEls.push(htmlEl);
        }
      });

      // Highlight detected animated elements
      for (const el of animatedEls.slice(0, 50)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const badge = document.createElement('div');
        badge.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;' +
          `top:${rect.top - 16}px;left:${rect.left}px;` +
          'background:#a855f7;color:white;padding:1px 6px;border-radius:2px;font-size:9px;font-family:system-ui,sans-serif;white-space:nowrap;';
        badge.textContent = '⬇ scroll-anim';
        addOverlayElement(badge);
        overlays.push(badge);

        const outline = document.createElement('div');
        outline.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;' +
          `top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;` +
          'border:2px dashed #a855f7;border-radius:3px;background:rgba(168,85,247,.05);';
        addOverlayElement(outline);
        overlays.push(outline);
      }

      // Also detect IntersectionObserver instances
      if ((window as any).__fdh_io_count === undefined) {
        const origIO = IntersectionObserver;
        (window as any).__fdh_io_count = 0;
        (window as any).IntersectionObserver = function (...args: any[]) {
          (window as any).__fdh_io_count++;
          return new origIO(...args);
        };
      }

      // Show IO count badge
      const ioCount = (window as any).__fdh_io_count || 0;
      if (ioCount > 0 && timelinePanel) {
        const ioBadge = document.createElement('span');
        ioBadge.style.cssText = 'background:#7c3aed;color:white;padding:2px 6px;border-radius:4px;font-size:10px;';
        ioBadge.textContent = `${ioCount} IO observers`;
        timelinePanel.insertBefore(ioBadge, timelinePanel.lastChild);
      }
    }

    let _cleanup = () => {
      if (disposed) return;
      disposed = true;
      if (freezeScroll) document.body.style.overflow = '';
      overlays.forEach(o => { if (o) removeOverlayElement(o); });
      overlays.length = 0;
    };

    function cleanup() { _cleanup(); }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
