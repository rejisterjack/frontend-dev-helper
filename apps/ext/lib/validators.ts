import { z } from 'zod';
import { TOOL_IDS } from '@/lib/constants';

const toolIdValues = Object.values(TOOL_IDS) as [string, ...string[]];

export const toolIdSchema = z.enum(toolIdValues);

export const toolActivationStateSchema = z.enum([
  'active',
  'inactive',
  'loading',
  'error',
]);

export const toolStateSchema = z.object({
  id: toolIdSchema,
  active: z.boolean(),
  activationState: toolActivationStateSchema,
  error: z.string().optional(),
  lastActivated: z.number().optional(),
  lastDeactivated: z.number().optional(),
});

export const toggleToolPayloadSchema = z.object({
  toolId: toolIdSchema,
  activate: z.boolean(),
});

export const setToolStatePayloadSchema = z.object({
  toolId: toolIdSchema,
  state: toolStateSchema,
});

export const getToolStatePayloadSchema = z.object({
  toolId: toolIdSchema,
});

export const extensionSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.enum(['small', 'medium', 'large']),
  showTooltips: z.boolean(),
  autoActivate: z.boolean(),
  overlayOpacity: z.number().min(0).max(1),
  highlightColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  persistState: z.boolean(),
  devToolsIntegration: z.boolean(),
  keyboardShortcuts: z.boolean(),
  compactMode: z.boolean(),
  notifications: z.boolean(),
  animationSpeed: z.enum(['slow', 'normal', 'fast']),
});

export const updateSettingsPayloadSchema = z.object({
  settings: extensionSettingsSchema.partial(),
});

export const llmConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'local']),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  maxTokens: z.number().int().min(1).max(128000),
  temperature: z.number().min(0).max(2),
  systemPrompt: z.string().optional(),
});

export const messageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('TOGGLE_TOOL'),
    payload: toggleToolPayloadSchema,
  }),
  z.object({
    type: z.literal('TOOL_STATE_CHANGED'),
    payload: z.object({
      toolId: toolIdSchema,
      active: z.boolean(),
      activationState: toolActivationStateSchema,
      error: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('SET_TOOL_STATE'),
    payload: setToolStatePayloadSchema,
  }),
  z.object({
    type: z.literal('GET_TOOL_STATE'),
    payload: getToolStatePayloadSchema,
  }),
  z.object({
    type: z.literal('DEACTIVATE_ALL_TOOLS'),
  }),
  z.object({
    type: z.literal('UPDATE_SETTINGS'),
    payload: updateSettingsPayloadSchema,
  }),
  z.object({
    type: z.literal('GET_SETTINGS'),
  }),
  z.object({
    type: z.literal('SETTINGS_UPDATED'),
    payload: extensionSettingsSchema,
  }),
  z.object({
    type: z.literal('ELEMENT_SELECTED'),
    payload: z.object({
      element: z.unknown(),
      toolId: toolIdSchema,
    }),
  }),
  z.object({
    type: z.literal('PERFORMANCE_DATA'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('ACCESSIBILITY_DATA'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('SITE_REPORT_DATA'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('COLOR_REPORT_DATA'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('SEO_REPORT_DATA'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('CONTENT_SCRIPT_READY'),
  }),
  z.object({
    type: z.literal('POPUP_OPENED'),
  }),
  z.object({
    type: z.literal('POPUP_CLOSED'),
  }),
  z.object({
    type: z.literal('EXECUTE_COMMAND'),
    payload: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      shortcut: z.string().optional(),
      toolId: toolIdSchema.optional(),
      category: z.enum([
        'inspection',
        'css',
        'responsive',
        'performance',
        'accessibility',
        'ai',
        'utility',
      ]),
    }),
  }),
  z.object({
    type: z.literal('COMMAND_RESULT'),
    payload: z.object({
      commandId: z.string(),
      result: z.unknown(),
    }),
  }),
  z.object({
    type: z.literal('LLM_QUERY'),
    payload: z.object({
      query: z.string().min(1),
      context: z.unknown().optional(),
    }),
  }),
  z.object({
    type: z.literal('LLM_RESPONSE'),
    payload: z.object({
      response: z.string(),
    }),
  }),
  z.object({
    type: z.literal('LLM_ERROR'),
    payload: z.object({
      error: z.string(),
    }),
  }),
  z.object({
    type: z.literal('VISUAL_REGRESSION_CAPTURE'),
    payload: z.object({
      name: z.string(),
      threshold: z.number().min(0).max(1),
    }),
  }),
  z.object({
    type: z.literal('VISUAL_REGRESSION_COMPARE'),
    payload: z.object({
      baselineId: z.string(),
      threshold: z.number().min(0).max(1),
    }),
  }),
  z.object({
    type: z.literal('VISUAL_REGRESSION_RESULT'),
    payload: z.unknown(),
  }),
  z.object({
    type: z.literal('CONTEXT_MENU_CLICKED'),
    payload: z.object({
      id: z.string(),
      title: z.string(),
      contexts: z.array(z.string()),
      toolId: toolIdSchema.optional(),
      action: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('KEYBOARD_SHORTCUT'),
    payload: z.object({
      shortcut: z.string(),
    }),
  }),
  z.object({
    type: z.literal('INIT_CONTENT_SCRIPT'),
  }),
  z.object({
    type: z.literal('DESTROY_CONTENT_SCRIPT'),
  }),
]);
