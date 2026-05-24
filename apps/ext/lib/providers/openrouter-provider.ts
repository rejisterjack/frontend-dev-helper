import type { LLMMessage } from '../types';
import type { LLMProvider, LLMProviderConfig, StreamChunk } from './base-provider';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 60000;
const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';

const OPENROUTER_MODELS = [
  // Free tier
  { id: 'meta-llama/llama-4-scout:free', label: 'Llama 4 Scout', tier: 'free' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3', tier: 'free' },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash', tier: 'free' },
  { id: 'nvidia/llama-3.1-nemotron-ultra-253b:free', label: 'Nemotron Ultra 253B', tier: 'free' },
  { id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3 235B', tier: 'free' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', label: 'Mistral Small 3.1', tier: 'free' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B', tier: 'free' },
  { id: 'openrouter/free', label: 'Auto (Free Router)', tier: 'free' },
  // Paid tier
  { id: 'openai/gpt-4o', label: 'GPT-4o', tier: 'paid' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', tier: 'paid' },
  { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4', tier: 'paid' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', tier: 'paid' },
  { id: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro', tier: 'paid' },
  { id: 'meta-llama/llama-4-maverick', label: 'Llama 4 Maverick', tier: 'paid' },
] as const;

export { OPENROUTER_MODELS };

export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';

  async sendMessage(config: LLMProviderConfig, messages: LLMMessage[]): Promise<string | null> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
            'HTTP-Referer': 'https://github.com/frontend-dev-helper',
            'X-Title': 'FDH Extension',
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
          }),
        });

        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
          continue;
        }

        if (!response.ok) {
          if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
            continue;
          }
          return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content ?? null;
      } catch {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * 2 ** attempt));
        }
      }
    }
    return null;
  }

  async sendStreamingMessage(
    config: LLMProviderConfig,
    messages: LLMMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://github.com/frontend-dev-helper',
          'X-Title': 'FDH Chat',
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          stream: true,
        }),
        signal,
      });

      if (response.status === 429) {
        onChunk({ content: '', done: true, error: 'Rate limited. Please wait and try again.' });
        return;
      }
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        onChunk({ content: '', done: true, error: `API error: ${response.status} ${errorBody}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onChunk({ content: '', done: true, error: 'No response body' });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) onChunk({ content, done: false });
          } catch {
            /* skip malformed chunks */
          }
        }
      }
      onChunk({ content: '', done: true });
    } catch (error) {
      if (signal?.aborted) return;
      onChunk({ content: '', done: true, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async testConnection(config: LLMProviderConfig): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey) {
      return { success: false, message: 'API key is required for OpenRouter.' };
    }

    try {
      const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://github.com/frontend-dev-helper',
          'X-Title': 'FDH Extension',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        return { success: true, message: `Connected to OpenRouter successfully (model: ${config.model}).` };
      }

      const errorBody = await response.text().catch(() => '');
      return { success: false, message: `API error ${response.status}: ${errorBody}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed.' };
    }
  }
}
