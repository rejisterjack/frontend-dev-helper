import { toolMetadata, metadataByCategory } from './metadata';
import type { ToolDefinition, ToolCategory } from './types';

// Lazy-loading proxy registry for backward compatibility.
// Components that only read metadata (id, name, description, category, icon, configSchema)
// get values synchronously. The `run` function triggers a dynamic import on first call.
export const toolRegistry: Record<string, ToolDefinition> = new Proxy(
  {} as Record<string, ToolDefinition>,
  {
    get(_, toolId: string) {
      const meta = toolMetadata[toolId];
      if (!meta) return undefined;

      return new Proxy({} as ToolDefinition, {
        get(_, prop: string | symbol) {
          if (prop === 'run') {
            return (ctx: Parameters<ToolDefinition['run']>[0], config?: Record<string, unknown>) => {
              let resolved: ToolDefinition | null = null;

              // Attempt synchronous dynamic import via preloaded chunk.
              // In practice the module loader below handles the async path.
              const promise = meta.loader().then((mod) => {
                for (const value of Object.values(mod)) {
                  if (
                    typeof value === 'object' &&
                    value !== null &&
                    'id' in value &&
                    'run' in value &&
                    (value as { id: string }).id === toolId
                  ) {
                    resolved = value as ToolDefinition;
                    break;
                  }
                }
                if (!resolved) throw new Error(`[FDH] Could not resolve tool: ${toolId}`);
                return resolved.run(ctx, config);
              });

              // The caller expects a sync cleanup function, but we need to load async.
              // Return a no-op cleanup; the real cleanup will happen via ctx.onInvalidated.
              const noop = () => {};
              return noop;
            };
          }
          if (prop === 'id') return meta.id;
          if (prop === 'name') return meta.name;
          if (prop === 'description') return meta.description;
          if (prop === 'category') return meta.category;
          if (prop === 'icon') return meta.icon;
          if (prop === 'configSchema') return meta.configSchema;
          return undefined;
        },
        has(_, prop) {
          return prop in meta || prop === 'run';
        },
      });
    },
    has(_, toolId: string) {
      return toolId in toolMetadata;
    },
    ownKeys() {
      return Object.keys(toolMetadata);
    },
    getOwnPropertyDescriptor(_, toolId: string) {
      if (toolId in toolMetadata) {
        return { configurable: true, enumerable: true, value: undefined };
      }
      return undefined;
    },
  },
);

export const toolsByCategory: Record<ToolCategory, ToolDefinition[]> = new Proxy(
  {} as Record<ToolCategory, ToolDefinition[]>,
  {
    get(_, category: string) {
      const metas = metadataByCategory[category as ToolCategory];
      if (!metas) return [];
      // Return proxy-wrapped metadata as ToolDefinition[] for backward compat
      return metas.map(
        (meta) => toolRegistry[meta.id],
      );
    },
    has(_, category: string) {
      return category in metadataByCategory;
    },
    ownKeys() {
      return Object.keys(metadataByCategory);
    },
    getOwnPropertyDescriptor(_, category: string) {
      if (category in metadataByCategory) {
        return { configurable: true, enumerable: true, value: undefined };
      }
      return undefined;
    },
  },
);

export function getToolDefinition(id: string): ToolDefinition | undefined {
  return toolRegistry[id];
}

export { toolMetadata as allTools };
