import type { ToolDefinition } from '../types';
import { addOverlayElement, removeOverlayElement, clearAllOverlays } from '@/content/overlay-manager';
import { jumpToElementSource } from '@/lib/element-source-resolver';

type FrameworkType = 'react' | 'vue' | 'angular' | 'svelte' | 'none';

interface FrameworkComponent {
  name: string;
  framework: FrameworkType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  hooks?: string[];
  domElement: HTMLElement;
}

interface ReactFiber {
  type?: { name?: string; displayName?: string };
  memoizedProps?: Record<string, unknown>;
  memoizedState?: { queue?: { name?: string }; memoizedState?: unknown; next?: ReactFiber['memoizedState'] | null } | null;
  child?: ReactFiber;
  sibling?: ReactFiber;
  return?: ReactFiber;
  _debugOwner?: ReactFiber;
}

function detectFramework(): FrameworkType {
  const w = window as unknown as Record<string, unknown>;
  if (w.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot], [data-reactid]')) return 'react';
  if (w.__VUE__ || document.querySelector('[data-v-app], [data-vue-root]')) return 'vue';
  if (w.ng || document.querySelector('[ng-app], [ng-version]')) return 'angular';
  if (w.__svelte || document.querySelector('[data-svelte]')) return 'svelte';
  return 'none';
}

function getVersion(framework: FrameworkType): string | undefined {
  const w = window as unknown as Record<string, unknown>;
  if (framework === 'react') return (w.React as { version?: string } | undefined)?.version;
  if (framework === 'vue') return (w.Vue as { version?: string } | undefined)?.version;
  if (framework === 'angular') return document.querySelector('[ng-version]')?.getAttribute('ng-version') ?? undefined;
  return undefined;
}

function getReactComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const key = Object.keys(element).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
  if (!key) return null;
  const fiber = (element as unknown as Record<string, ReactFiber>)[key];
  if (!fiber) return null;
  let owner = fiber._debugOwner || fiber.return;
  while (owner && !owner.type?.name) owner = owner.return;
  if (!owner) return null;
  const hooks: string[] = [];
  let state = owner.memoizedState;
  while (state) {
    if (state.queue?.name) hooks.push(state.queue.name);
    else if (state.memoizedState && typeof state.memoizedState === 'object') hooks.push('useState');
    state = state.next ?? null;
  }
  return { name: owner.type?.name || owner.type?.displayName || 'Unknown', framework: 'react', props: owner.memoizedProps || {}, hooks, domElement: element };
}

function getVueComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const vueEl = element as unknown as Record<string, unknown>;
  const comp = vueEl.__vue__;
  if (comp) {
    const c = comp as Record<string, unknown>;
    return {
      name: (c.$options as Record<string, unknown>)?.name as string || 'Anonymous',
      framework: 'vue',
      props: (c.$props as Record<string, unknown>) || {},
      state: (c.$data as Record<string, unknown>) || {},
      domElement: element,
    };
  }
  let parent = element.parentElement;
  while (parent) {
    const p = (parent as unknown as Record<string, unknown>).__vue__;
    if (p) {
      const c = p as Record<string, unknown>;
      return {
        name: (c.$options as Record<string, unknown>)?.name as string || 'Anonymous',
        framework: 'vue',
        props: (c.$props as Record<string, unknown>) || {},
        state: (c.$data as Record<string, unknown>) || {},
        domElement: element,
      };
    }
    parent = parent.parentElement;
  }
  return null;
}

function getAngularComponentInfo(element: HTMLElement): FrameworkComponent | null {
  const ngComp = (element as unknown as Record<string, unknown>).ngComponent;
  if (!ngComp) return null;
  return {
    name: (ngComp as { constructor?: { name?: string } }).constructor?.name || 'AngularComponent',
    framework: 'angular',
    props: {},
    domElement: element,
  };
}

function getComponentInfo(element: HTMLElement, framework: FrameworkType): FrameworkComponent | null {
  switch (framework) {
    case 'react': return getReactComponentInfo(element);
    case 'vue': return getVueComponentInfo(element);
    case 'angular': return getAngularComponentInfo(element);
    default: return null;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const frameworkDevtools: ToolDefinition = {
  id: 'framework-devtools',
  name: 'Framework DevTools',
  description: 'Bridge to framework-specific developer tools (React, Vue, etc.)',
  category: 'inspection',
  icon: 'Code2',
  configSchema: {
    framework: {
      type: 'select',
      label: 'Framework',
      default: 'auto',
      options: [
        { label: 'Auto Detect', value: 'auto' },
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' },
        { label: 'Angular', value: 'angular' },
        { label: 'Svelte', value: 'svelte' },
      ],
    },
    showOverlay: { type: 'boolean', label: 'Show Overlay', default: true },
    autoOpen: { type: 'boolean', label: 'Auto Open DevTools', default: false },
  },
  run: (ctx, config) => {
    const targetFramework = (config?.framework as string) ?? 'auto';
    const showOverlay = (config?.showOverlay as boolean) ?? true;
    const framework = targetFramework === 'auto' ? detectFramework() : targetFramework as FrameworkType;
    const version = getVersion(framework);
    const overlayEls: HTMLDivElement[] = [];

    const panelHost = document.createElement('div');
    panelHost.style.cssText = 'position:fixed;top:20px;right:20px;width:400px;max-height:75vh;z-index:2147483646;';
    const shadow = panelHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .panel{background:#1e1e2e;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid #313244;overflow:hidden;display:flex;flex-direction:column;max-height:75vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#cdd6f4;}
      .header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825;}
      .title{font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;}
      .fw-badge{background:#89b4fa;color:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;}
      .actions{display:flex;gap:4px;}
      .actions button{background:transparent;border:none;color:#6c7086;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .actions button:hover{background:#313244;color:#cdd6f4;}
      .content{flex:1;overflow-y:auto;padding:12px;}
      .section{margin-bottom:12px;}
      .section-title{font-size:11px;text-transform:uppercase;color:#6c7086;margin-bottom:6px;font-weight:600;}
      .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #313244;}
      .info-label{color:#a6adc8;}
      .info-value{font-weight:600;}
      .devtools-status{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px;}
      .status-dot{width:8px;height:8px;border-radius:50%;}
      .component-card{background:#313244;padding:10px 12px;border-radius:6px;margin-bottom:8px;cursor:pointer;transition:background 0.15s;}
      .component-card:hover{background:#45475a;}
      .comp-name{font-weight:600;color:#f5c2e7;font-family:monospace;font-size:13px;}
      .comp-props{font-size:11px;color:#a6e3a1;font-family:monospace;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .empty{text-align:center;padding:40px 20px;color:#6c7086;}
      .footer{display:flex;justify-content:space-between;padding:10px 16px;border-top:1px solid #313244;background:#181825;font-size:11px;color:#6c7086;}
      .content::-webkit-scrollbar{width:6px;}
      .content::-webkit-scrollbar-thumb{background:#313244;border-radius:3px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'header';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'title';
    titleDiv.textContent = 'Framework DevTools';
    const badge = document.createElement('span');
    badge.className = 'fw-badge';
    badge.textContent = framework;
    titleDiv.appendChild(badge);
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';
    const btnClose = document.createElement('button');
    btnClose.textContent = '✕';
    actionsDiv.appendChild(btnClose);
    header.append(titleDiv, actionsDiv);

    const content = document.createElement('div');
    content.className = 'content';

    panel.append(header, content);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function renderFrameworkInfo(): void {
      while (content.firstChild) content.removeChild(content.firstChild);

      const devtoolsAvailable = (() => {
        const w = window as unknown as Record<string, unknown>;
        switch (framework) {
          case 'react': return !!w.__REACT_DEVTOOLS_GLOBAL_HOOK__;
          case 'vue': return !!w.__VUE_DEVTOOLS_GLOBAL_HOOK__;
          case 'angular': return !!w.ng;
          default: return false;
        }
      })();

      const devtoolsDiv = document.createElement('div');
      devtoolsDiv.className = 'devtools-status';
      devtoolsDiv.style.background = devtoolsAvailable ? 'rgba(166,227,161,0.1)' : 'rgba(243,139,168,0.1)';
      const dot = document.createElement('span');
      dot.className = 'status-dot';
      dot.style.background = devtoolsAvailable ? '#a6e3a1' : '#f38ba8';
      devtoolsDiv.appendChild(dot);
      const statusText = document.createElement('span');
      statusText.textContent = devtoolsAvailable ? 'DevTools hooks detected' : 'No DevTools hooks found';
      devtoolsDiv.appendChild(statusText);
      content.appendChild(devtoolsDiv);

      const infoSection = document.createElement('div');
      infoSection.className = 'section';
      const infoTitle = document.createElement('div');
      infoTitle.className = 'section-title';
      infoTitle.textContent = 'Framework Info';
      infoSection.appendChild(infoTitle);

      const addRow = (label: string, value: string) => {
        const row = document.createElement('div');
        row.className = 'info-row';
        const lbl = document.createElement('span');
        lbl.className = 'info-label';
        lbl.textContent = label;
        const val = document.createElement('span');
        val.className = 'info-value';
        val.textContent = value;
        row.append(lbl, val);
        infoSection.appendChild(row);
      };
      addRow('Framework', framework);
      if (version) addRow('Version', version);
      addRow('URL', window.location.href);
      content.appendChild(infoSection);

      const componentsSection = document.createElement('div');
      componentsSection.className = 'section';
      const compTitle = document.createElement('div');
      compTitle.className = 'section-title';
      compTitle.textContent = 'Hover elements to inspect';
      componentsSection.appendChild(compTitle);

      if (framework === 'none') {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No framework detected on this page';
        componentsSection.appendChild(empty);
      } else {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:12px;color:#6c7086;padding:8px 0;';
        hint.textContent = 'Move your mouse over elements to see component info.';
        componentsSection.appendChild(hint);
      }
      content.appendChild(componentsSection);
    }

    let currentHighlight: HTMLDivElement | null = null;
    let currentCompCard: HTMLDivElement | null = null;

    function handleMouseMove(e: MouseEvent): void {
      const target = e.target as HTMLElement;
      if (!target || target === document.documentElement || target === document.body) return;
      if (panelHost.contains(target)) return;

      if (currentHighlight) { removeOverlayElement(currentHighlight); currentHighlight = null; }
      if (currentCompCard) { currentCompCard.remove(); currentCompCard = null; }

      const comp = getComponentInfo(target, framework);
      if (!comp) return;

      if (showOverlay) {
        const rect = target.getBoundingClientRect();
        currentHighlight = document.createElement('div');
        currentHighlight.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border:2px solid #89b4fa;background:rgba(137,180,250,0.08);pointer-events:none;z-index:2147483641;border-radius:3px;`;
        addOverlayElement(currentHighlight);
      }

      const card = document.createElement('div');
      card.className = 'component-card';
      card.style.pointerEvents = 'auto';
      card.addEventListener('click', (ev) => {
        ev.stopPropagation();
        jumpToElementSource(comp.domElement);
      });
      const nameEl = document.createElement('div');
      nameEl.className = 'comp-name';
      nameEl.textContent = '<' + comp.name + ' />';
      card.appendChild(nameEl);

      if (comp.props && Object.keys(comp.props).length > 0) {
        const filtered = Object.entries(comp.props).filter(([k]) => !k.startsWith('__') && k !== 'children' && k !== 'key' && k !== 'ref');
        if (filtered.length > 0) {
          const propsEl = document.createElement('div');
          propsEl.className = 'comp-props';
          propsEl.textContent = filtered.slice(0, 5).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 30)}`).join(' ');
          card.appendChild(propsEl);
        }
      }
      if (comp.hooks && comp.hooks.length > 0) {
        const hooksEl = document.createElement('div');
        hooksEl.style.cssText = 'font-size:11px;color:#89b4fa;font-family:monospace;margin-top:4px;';
        hooksEl.textContent = 'Hooks: ' + comp.hooks.join(', ');
        card.appendChild(hooksEl);
      }

      const section = content.querySelector('.section:last-child');
      if (section) {
        section.appendChild(card);
        currentCompCard = card;
      }
    }

    function handleMouseLeave(): void {
      if (currentHighlight) { removeOverlayElement(currentHighlight); currentHighlight = null; }
      if (currentCompCard) { currentCompCard.remove(); currentCompCard = null; }
    }

    function handleKeydown(e: KeyboardEvent): void {
      if (e.key === 'Escape') cleanup();
    }

    renderFrameworkInfo();

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);
    document.addEventListener('keydown', handleKeydown, true);

    btnClose.addEventListener('click', cleanup);

    function cleanup(): void {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
      document.removeEventListener('keydown', handleKeydown, true);
      if (currentHighlight) removeOverlayElement(currentHighlight);
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
