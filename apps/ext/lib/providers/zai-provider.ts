import type { LLMMessage } from '../types';
import type { LLMProvider, LLMProviderConfig, StreamChunk } from './base-provider';

const DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4';

const ZAI_MODELS = [
  { id: 'glm-5.1', label: 'GLM-5.1', tier: 'paid' },
  { id: 'glm-5-turbo', label: 'GLM-5 Turbo', tier: 'paid' },
  { id: 'glm-5', label: 'GLM-5', tier: 'paid' },
  { id: 'glm-4.7', label: 'GLM-4.7', tier: 'paid' },
  { id: 'glm-4.7-flash', label: 'GLM-4.7 Flash', tier: 'free' },
  { id: 'glm-4.7-flashx', label: 'GLM-4.7 FlashX', tier: 'free' },
  { id: 'glm-4.6', label: 'GLM-4.6', tier: 'paid' },
  { id: 'glm-4.5', label: 'GLM-4.5', tier: 'paid' },
  { id: 'glm-4.5-air', label: 'GLM-4.5 Air', tier: 'free' },
  { id: 'glm-4.5-x', label: 'GLM-4.5 X', tier: 'paid' },
  { id: 'glm-4.5-airx', label: 'GLM-4.5 AirX', tier: 'free' },
  { id: 'glm-4.5-flash', label: 'GLM-4.5 Flash', tier: 'free' },
] as const;

export { ZAI_MODELS };

export class ZAIProvider implements LLMProvider {
  readonly name = 'zai';

  async sendMessage(config: LLMProviderConfig, messages: LLMMessage[]): Promise<string | null> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      return null;
    }
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

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        onChunk({ content: '', done: true, error: `Z.AI API error ${response.status}: ${errorBody}` });
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
      return { success: false, message: 'API key is required. Get one at z.ai' };
    }

    try {
      const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        return { success: true, message: `Connected to Z.AI (model: ${config.model})` };
      }

      const errorBody = await response.text().catch(() => '');
      return { success: false, message: `API error ${response.status}: ${errorBody}` };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed.' };
    }
  }
}
