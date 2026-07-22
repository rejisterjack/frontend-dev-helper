import type { LLMMessage } from './types';
import type { PageContextData } from './messaging/types';

export interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface FunctionCall {
  id: string;
  name: string;
  arguments: string;
}

export interface FunctionResult {
  callId: string;
  name: string;
  result: string;
  error?: string;
}

const TOOL_FUNCTIONS: AIFunction[] = [
  {
    name: 'activate_tool',
    description: 'Activate a debugging tool on the current page. The tool will run and provide results.',
    parameters: {
      type: 'object',
      properties: {
        tool_id: {
          type: 'string',
          description: 'The ID of the tool to activate. Available tools: dom-outliner, spacing-visualizer, font-inspector, color-picker, pixel-ruler, element-inspector, tech-detector, component-tree, focus-debugger, form-debugger, z-index-visualizer, smart-element-picker, css-inspector, css-editor, css-scanner, css-variable-inspector, layout-visualizer, grid-overlay, contrast-checker, animation-inspector, design-system-validator, breakpoint-overlay, network-analyzer, flame-graph, performance-budget, accessibility-audit, focus-debugger-a11y, screenshot-studio, storage-inspector, visual-regression, responsive-preview, site-report-generator, ai-auto-fix',
        },
        config: {
          type: 'object',
          description: 'Optional configuration for the tool',
        },
      },
      required: ['tool_id'],
    },
  },
  {
    name: 'deactivate_tool',
    description: 'Deactivate a currently running tool on the page.',
    parameters: {
      type: 'object',
      properties: {
        tool_id: {
          type: 'string',
          description: 'The ID of the tool to deactivate.',
        },
      },
      required: ['tool_id'],
    },
  },
  {
    name: 'inspect_element',
    description: 'Get detailed information about a specific DOM element using a CSS selector. Returns HTML, computed styles, accessibility attributes, and box model data.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to identify the element (e.g., "#header", ".nav-link", "h1")',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'get_page_context',
    description: 'Get comprehensive live data about the current page including DOM stats, performance metrics, accessibility issues, and storage data.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'run_accessibility_audit',
    description: 'Run an accessibility audit on the current page and return detailed WCAG compliance results.',
    parameters: {
      type: 'object',
      properties: {
        standard: {
          type: 'string',
          description: 'WCAG standard to check against',
          enum: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag2aaa'],
        },
      },
      required: [],
    },
  },
  {
    name: 'check_contrast',
    description: 'Check color contrast ratios for text elements on the page and identify failures.',
    parameters: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Optional CSS selector to check contrast for specific elements. If omitted, checks all text.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_network_requests',
    description: 'Get a list of network requests made by the page, including timing, size, and status.',
    parameters: {
      type: 'object',
      properties: {
        filter_type: {
          type: 'string',
          description: 'Filter by resource type',
          enum: ['all', 'xhr', 'script', 'stylesheet', 'image', 'font', 'document'],
        },
      },
      required: [],
    },
  },
  {
    name: 'get_css_properties',
    description: 'Extract CSS custom properties (variables), color palette, and typography from the page.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'suggest_fix',
    description: 'Generate a code fix suggestion for a specific issue identified on the page.',
    parameters: {
      type: 'object',
      properties: {
        issue_description: {
          type: 'string',
          description: 'Description of the issue to fix',
        },
        element_selector: {
          type: 'string',
          description: 'CSS selector of the element with the issue',
        },
        fix_type: {
          type: 'string',
          description: 'Type of fix needed',
          enum: ['accessibility', 'performance', 'css', 'html', 'seo', 'best-practice'],
        },
      },
      required: ['issue_description', 'fix_type'],
    },
  },
];

export function getToolFunctionDefinitions(): AIFunction[] {
  return TOOL_FUNCTIONS;
}

export function buildFunctionCallingSystemPrompt(
  pageContext?: {
    url: string;
    title: string;
    viewport: string;
    techStack: string[];
    pageContext?: PageContextData;
  },
  selectedElement?: {
    tagName: string;
    selector: string;
    html: string;
    computedStyles: Record<string, string>;
    ariaAttributes: Record<string, string>;
  },
): string {
  const elementContext = selectedElement
    ? `
## Currently Selected Element
**Tag:** <${selectedElement.tagName}>
**Selector:** ${selectedElement.selector}
**HTML:** \`${selectedElement.html.slice(0, 500)}\`
**Computed Styles:** ${JSON.stringify(selectedElement.computedStyles, null, 2)}
**ARIA Attributes:** ${Object.keys(selectedElement.ariaAttributes).length > 0 ? JSON.stringify(selectedElement.ariaAttributes, null, 2) : 'None'}
`
    : '';

  const pageInfo = pageContext?.pageContext
    ? `
**URL:** ${pageContext.pageContext.url}
**Title:** ${pageContext.pageContext.title}
**Viewport:** ${pageContext.pageContext.viewport.width}x${pageContext.pageContext.viewport.height}
**Tech Stack:** ${pageContext.pageContext.techStack.join(', ') || 'Unknown'}
**DOM Elements:** ${pageContext.pageContext.domStats.totalElements}
**Console Errors:** ${pageContext.pageContext.consoleErrors.length}
`
    : `**Page:** ${pageContext?.url ?? 'Unknown'}`;

  return `You are FrontendDevHelper AI, an expert browser DevTools assistant with the ability to run tools and inspect pages.

You have access to tools that let you ACT on the page, not just analyze it. When a user asks about the page, use your tools to gather data first, then provide informed answers.

${pageInfo}
${elementContext}

## Available Tools

You can call these functions to interact with the page:
${TOOL_FUNCTIONS.map((f) => `- **${f.name}**: ${f.description}`).join('\n')}

## How to Use Tools

1. When asked to analyze something, FIRST call the appropriate tool to get live data
2. Then synthesize the tool results into a clear, actionable answer
3. For multi-step analysis, call multiple tools as needed
4. Always base your answers on real data from the tools, not assumptions

## Response Format

- Use markdown formatting
- Include code examples when suggesting fixes
- Reference specific elements, selectors, and metrics from tool results
- Prioritize by impact (critical -> low)
- Keep responses concise and actionable

## Multi-Step Reasoning

For complex questions, think through the steps:
1. What data do I need?
2. Which tool(s) should I call?
3. What does the data tell me?
4. What is my recommendation?

Show your reasoning briefly before diving into results.`;
}

export function parseFunctionCalls(content: string): FunctionCall[] {
  const calls: FunctionCall[] = [];

  // Try to parse as JSON function call format (OpenAI-compatible)
  try {
    const parsed = JSON.parse(content);
    if (parsed.tool_calls) {
      for (const call of parsed.tool_calls) {
        calls.push({
          id: call.id,
          name: call.function.name,
          arguments: typeof call.function.arguments === 'string'
            ? call.function.arguments
            : JSON.stringify(call.function.arguments),
        });
      }
    }
  } catch {
    // Not JSON, try to extract function calls from text
  }

  // Also try to find inline function calls like: [activate_tool("dom-outliner")]
  const inlinePattern = /\[(\w+)\((.*?)\)\]/g;
  let match;
  while ((match = inlinePattern.exec(content)) !== null) {
    calls.push({
      id: `call_${Date.now()}_${calls.length}`,
      name: match[1],
      arguments: match[2] || '{}',
    });
  }

  return calls;
}

export interface AIFunctionHandler {
  (name: string, args: Record<string, unknown>): Promise<string>;
}

export async function executeFunctionCall(
  call: FunctionCall,
  handler: AIFunctionHandler,
): Promise<FunctionResult> {
  try {
    let args: Record<string, unknown>;
    try {
      args = JSON.parse(call.arguments);
    } catch {
      args = {};
    }

    const result = await handler(call.name, args);
    return {
      callId: call.id,
      name: call.name,
      result,
    };
  } catch (error) {
    return {
      callId: call.id,
      name: call.name,
      result: 'Error executing function',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildFunctionResultsMessage(results: FunctionResult[]): LLMMessage {
  const content = results
    .map((r) => {
      if (r.error) {
        return `[Tool: ${r.name}] Error: ${r.error}`;
      }
      return `[Tool: ${r.name}] Result: ${r.result}`;
    })
    .join('\n\n');

  return {
    role: 'assistant',
    content,
  };
}

export async function sendFunctionCallingRequest(
  aiConfig: { apiKey: string; model: string; baseUrl: string },
  messages: LLMMessage[],
  pageContext?: {
    url: string;
    title: string;
    viewport: string;
    techStack: string[];
    pageContext?: PageContextData;
  },
  selectedElement?: {
    tagName: string;
    selector: string;
    html: string;
    computedStyles: Record<string, string>;
    ariaAttributes: Record<string, string>;
  },
  functionHandler?: AIFunctionHandler,
  maxSteps = 5,
): Promise<string> {
  if (!aiConfig.apiKey) {
    return 'AI not configured. Open Settings to add your API key.';
  }

  const systemPrompt = buildFunctionCallingSystemPrompt(pageContext, selectedElement);
  const tools = getToolFunctionDefinitions();

  const baseUrl = aiConfig.baseUrl || 'https://openrouter.ai/api/v1';
  const fullMessages: LLMMessage[] = [{ role: 'system', content: systemPrompt }, ...messages];

  let finalResponse = '';

  for (let step = 0; step < maxSteps; step++) {
    const body: Record<string, unknown> = {
      model: aiConfig.model,
      messages: fullMessages,
      temperature: 0.3,
      max_tokens: 2000,
    };

    // Add tools/functions if the model supports it
    if (functionHandler) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.apiKey}`,
        'HTTP-Referer': 'https://github.com/frontend-dev-helper',
        'X-Title': 'FDH Function Calling',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return `API error: ${response.status} ${errorBody}`;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) return 'No response from API';

    const message = choice.message;

    // Check for tool calls
    if (message.tool_calls && functionHandler) {
      const results: FunctionResult[] = [];
      for (const toolCall of message.tool_calls) {
        const call: FunctionCall = {
          id: toolCall.id,
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        };
        const result = await executeFunctionCall(call, functionHandler);
        results.push(result);
      }

      // Add assistant message with tool calls
      fullMessages.push({
        role: 'assistant',
        content: message.content || '',
      });

      // Add tool results
      for (const result of results) {
        fullMessages.push({
          role: 'assistant',
          content: `[Tool Result: ${result.name}] ${result.error ? `Error: ${result.error}` : result.result}`,
        });
      }

      // If the model wants to stop calling tools, break
      if (choice.finish_reason === 'stop') {
        finalResponse = message.content || '';
        break;
      }

      continue;
    }

    // No tool calls - this is the final response
    finalResponse = message.content || '';
    break;
  }

  return finalResponse;
}
