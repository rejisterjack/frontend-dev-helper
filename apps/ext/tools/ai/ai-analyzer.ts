import type { ToolDefinition } from '../types';

export const aiAnalyzer: ToolDefinition = {
  id: 'ai-analyzer',
  name: 'AI Analyzer',
  description: 'Analyze page structure, patterns, and issues using AI',
  category: 'ai',
  icon: 'Bot',
  configSchema: {
    analyzeStructure: { type: 'boolean', label: 'Analyze Structure', default: true },
    analyzeSemantics: { type: 'boolean', label: 'Analyze Semantics', default: true },
    analyzePatterns: { type: 'boolean', label: 'Analyze Patterns', default: true },
    detailLevel: {
      type: 'select',
      label: 'Detail Level',
      default: 'medium',
      options: [
        { label: 'Brief', value: 'brief' },
        { label: 'Medium', value: 'medium' },
        { label: 'Detailed', value: 'detailed' },
      ],
    },
    includeCode: { type: 'boolean', label: 'Include Code Samples', default: true },
  },
  run: (ctx, _config) => {
    const overlays: HTMLElement[] = [];
    let disposed = false;

    function esc(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getPageContext() {
      const imgs = document.querySelectorAll('img');
      const links = document.querySelectorAll('a[href]');
      const headings = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
      return {
        url: location.href,
        title: document.title,
        domStats: { totalElements: document.querySelectorAll('*').length, images: imgs.length, links: links.length, headings: headings.length },
        techStack: detectTech(),
      };
    }

    function detectTech(): string[] {
      const tech: string[] = [];
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) tech.push('React');
      if ((window as any).__VUE__) tech.push('Vue');
      if ((window as any).ng || document.querySelector('[ng-app],[ng-controller]')) tech.push('Angular');
      if ((window as any).__SVELTE__) tech.push('Svelte');
      if (document.querySelector('[data-reactroot],[data-reactid]')) tech.push('React');
      if (document.querySelector('[data-v-]')) tech.push('Vue');
      if (document.querySelector('meta[name="generator"][content*="WordPress"]')) tech.push('WordPress');
      if (document.querySelector('meta[name="generator"][content*="Next.js"]')) tech.push('Next.js');
      if (document.querySelector('meta[name="generator"][content*="Nuxt"]')) tech.push('Nuxt');
      return tech.length ? tech : ['Unknown'];
    }

    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:16px;right:16px;width:420px;max-height:520px;z-index:2147483647;' +
      'background:#0f172a;border:1px solid #334155;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);' +
      'font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0;font-size:13px;display:flex;flex-direction:column;overflow:hidden;';
    addOverlayElement(panel);
    overlays.push(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#1e293b;border-bottom:1px solid #334155;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight:600;font-size:14px;';
    titleEl.textContent = 'AI Page Analyzer';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:18px;padding:0 4px;';
    closeBtn.textContent = '×';
    closeBtn.onclick = cleanup;
    header.append(titleEl, closeBtn);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

    const loading = document.createElement('div');
    loading.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;color:#94a3b8;padding:40px 0;';
    loading.textContent = 'Analyzing page...';
    body.appendChild(loading);

    panel.append(header, body);

    async function analyze() {
      const context = getPageContext();
      try {
        const response = await browser.runtime.sendMessage({
          type: 'LLM_QUERY',
          payload: { query: `Analyze this page for issues. URL: ${context.url}, Title: ${context.title}, Tech: ${context.techStack.join(', ')}, Elements: ${context.domStats.totalElements}, Images: ${context.domStats.images}, Links: ${context.domStats.links}, Headings: ${context.domStats.headings}`, context },
        });
        if (disposed) return;
        body.removeChild(loading);
        if (response?.response) {
          renderSuggestions(response.response);
        } else {
          renderError('No response from AI service. Check your API key in Settings.');
        }
      } catch (err) {
        if (disposed) return;
        body.removeChild(loading);
        renderError('AI analysis failed. Ensure AI is configured in Settings.');
      }
    }

    function renderSuggestions(text: string) {
      const container = document.createElement('div');
      container.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

      const categories = [
        { pattern: /accessibility/i, label: 'Accessibility', color: '#a855f7' },
        { pattern: /performance/i, label: 'Performance', color: '#3b82f6' },
        { pattern: /seo/i, label: 'SEO', color: '#22c55e' },
        { pattern: /best.?practice|security/i, label: 'Best Practices', color: '#f59e0b' },
      ];

      const lines = text.split('\n').filter(l => l.trim());
      let currentCat: { label: string; color: string } | null = null;
      const groups: Map<string, string[]> = new Map();
      groups.set('Analysis', []);

      for (const line of lines) {
        let matched = false;
        for (const cat of categories) {
          if (cat.pattern.test(line)) {
            currentCat = cat;
            if (!groups.has(cat.label)) groups.set(cat.label, []);
            matched = true;
            break;
          }
        }
        if (!matched && line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().match(/^\d+\./)) {
          const g = currentCat ? currentCat.label : 'Analysis';
          groups.get(g)?.push(line.replace(/^[\s\-\*\d.]+/, '').trim());
        } else if (!matched && line.trim().length > 0) {
          const g = currentCat ? currentCat.label : 'Analysis';
          groups.get(g)?.push(line.trim());
        }
      }

      groups.forEach((items, catLabel) => {
        if (items.length === 0) return;
        const cat = categories.find(c => c.label === catLabel);
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom:12px;';
        const catHeader = document.createElement('div');
        catHeader.style.cssText = `font-weight:600;font-size:12px;color:${cat?.color || '#94a3b8'};margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;`;
        catHeader.textContent = catLabel;
        section.appendChild(catHeader);
        for (const item of items.slice(0, 8)) {
          const p = document.createElement('div');
          p.style.cssText = 'padding:4px 8px;margin:2px 0;background:rgba(255,255,255,.04);border-radius:4px;font-size:12px;line-height:1.5;color:#cbd5e1;';
          p.textContent = item;
          section.appendChild(p);
        }
        container.appendChild(section);
      });

      body.appendChild(container);
    }

    function renderError(msg: string) {
      const err = document.createElement('div');
      err.style.cssText = 'color:#f871c7;padding:20px;text-align:center;font-size:13px;';
      err.textContent = msg;
      body.appendChild(err);
    }

    function cleanup() {
      if (disposed) return;
      disposed = true;
      overlays.forEach(o => removeOverlayElement(o));
      overlays.length = 0;
    }

    ctx.onInvalidated(cleanup);
    analyze();
    return cleanup;
  },
};
