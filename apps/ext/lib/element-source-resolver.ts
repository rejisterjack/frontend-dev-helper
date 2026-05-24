import {
  findSourceMapUrls,
  discoverExternalSourceMaps,
  resolvePosition,
  enrichSourceMapInfo,
} from './source-map-resolver';
import { getBridge } from './vscode-bridge';

export interface ElementSource {
  file: string;
  line: number;
  column: number;
}

// ---------------------------------------------------------------------------
// Resolver interface for plugin-based chain
// ---------------------------------------------------------------------------

interface SourceResolver {
  name: string;
  resolve(el: HTMLElement): ElementSource | null;
}

// ---------------------------------------------------------------------------
// React fiber source extraction
// ---------------------------------------------------------------------------

const REACT_FIBER_RE = /^__reactFiber\$/;
const REACT_INTERNAL_RE = /^__reactInternalInstance\$/;

interface ReactFiber {
  _debugSource?: { fileName: string; lineNumber: number };
  type?: { name?: string; displayName?: string };
  return?: ReactFiber;
  stateNode?: Element | null;
}

function getReactFiber(el: HTMLElement): ReactFiber | null {
  const key = Object.keys(el).find(
    (k) => REACT_FIBER_RE.test(k) || REACT_INTERNAL_RE.test(k),
  );
  if (!key) return null;
  return (el as unknown as Record<string, ReactFiber>)[key] ?? null;
}

const reactResolver: SourceResolver = {
  name: 'react',
  resolve(el: HTMLElement): ElementSource | null {
    let fiber: ReactFiber | null | undefined = getReactFiber(el);
    while (fiber) {
      if (fiber._debugSource) {
        return {
          file: fiber._debugSource.fileName,
          line: fiber._debugSource.lineNumber,
          column: 0,
        };
      }
      fiber = fiber.return;
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Vue component source extraction
// ---------------------------------------------------------------------------

const vueResolver: SourceResolver = {
  name: 'vue',
  resolve(el: HTMLElement): ElementSource | null {
    // Vue 3
    const vue3Instance = (el as any).__vueParentComponent;
    if (vue3Instance) {
      const file = vue3Instance.type?.__file || vue3Instance.$options?.__file;
      if (file) {
        return { file, line: 0, column: 0 };
      }
    }
    // Vue 2
    const vue2Instance = (el as any).__vue__;
    if (vue2Instance && vue2Instance.$options) {
      const file = vue2Instance.$options.__file;
      if (file) {
        return { file, line: 0, column: 0 };
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Svelte source extraction
// ---------------------------------------------------------------------------

const svelteResolver: SourceResolver = {
  name: 'svelte',
  resolve(el: HTMLElement): ElementSource | null {
    // Svelte 5: __svelte_meta on DOM nodes
    const meta5 = (el as any).__svelte_meta;
    if (meta5?.loc) {
      return {
        file: meta5.loc.file || '',
        line: meta5.loc.line ?? 0,
        column: meta5.loc.column ?? 0,
      };
    }

    // Walk up DOM to find nearest Svelte component boundary
    let node: HTMLElement | null = el;
    while (node) {
      const meta = (node as any).__svelte_meta;
      if (meta?.loc) {
        return {
          file: meta.loc.file || '',
          line: meta.loc.line ?? 0,
          column: meta.loc.column ?? 0,
        };
      }
      node = node.parentElement;
    }

    return null;
  },
};

// ---------------------------------------------------------------------------
// Resolver chain (ordered by reliability)
// ---------------------------------------------------------------------------

const resolvers: SourceResolver[] = [reactResolver, svelteResolver, vueResolver];

// ---------------------------------------------------------------------------
// Source map-based resolution via component name matching
// ---------------------------------------------------------------------------

async function resolveViaComponentName(el: HTMLElement): Promise<ElementSource | null> {
  let componentName: string | null = null;

  // Try React fiber name
  const fiber = getReactFiber(el);
  if (fiber?.type) {
    componentName =
      (fiber.type as any).displayName || (fiber.type as any).name || null;
  }

  if (!componentName) {
    // Try Vue component name
    const vue3 = (el as any).__vueParentComponent;
    if (vue3?.type?.name) {
      componentName = vue3.type.name;
    } else {
      const vue2 = (el as any).__vue__;
      if (vue2?.$options?.name) {
        componentName = vue2.$options.name;
      }
    }
  }

  if (!componentName) return null;

  // Try discovered source maps first (more accurate), fall back to sync discovery
  const maps = await discoverExternalSourceMaps();
  const syncMaps = findSourceMapUrls();
  const allMaps = [...maps, ...syncMaps];
  const seenUrls = new Set<string>();
  const uniqueMaps = allMaps.filter((m) => {
    if (seenUrls.has(m.sourceMapUrl)) return false;
    seenUrls.add(m.sourceMapUrl);
    return true;
  });

  for (const info of uniqueMaps) {
    const enriched = await enrichSourceMapInfo(info);
    if (!enriched) continue;

    for (const source of enriched.sources) {
      const fileName = source.split('/').pop() || '';
      const baseName = fileName.replace(/\.(tsx?|jsx?|svelte|vue)$/, '');
      // kebab-case variant of component name
      const kebabName = componentName!
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();

      if (
        baseName.toLowerCase() === componentName!.toLowerCase() ||
        baseName.toLowerCase() === kebabName
      ) {
        return { file: source, line: 0, column: 0 };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export async function resolveElementSource(el: HTMLElement): Promise<ElementSource | null> {
  // Strategy 1: Framework-specific source extraction (synchronous, fast)
  for (const resolver of resolvers) {
    const result = resolver.resolve(el);
    if (result && result.file) return result;
  }

  // Strategy 2: Component name → source map matching (async)
  const nameSource = await resolveViaComponentName(el);
  if (nameSource) return nameSource;

  return null;
}

// ---------------------------------------------------------------------------
// Convenience: resolve + jump to source
// ---------------------------------------------------------------------------

export async function jumpToElementSource(el: HTMLElement): Promise<boolean> {
  const source = await resolveElementSource(el);
  if (!source) return false;

  const bridge = getBridge();
  if (!bridge.connected) return false;

  bridge.jumpToSource(source.file, source.line, source.column);
  return true;
}
