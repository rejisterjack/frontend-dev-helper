import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenRouterProvider } from '@/lib/providers/openrouter-provider';
import type { LLMProviderConfig } from '@/lib/providers/base-provider';

const mockConfig: LLMProviderConfig = {
  apiKey: 'test-key',
  model: 'openai/gpt-4',
  baseUrl: 'https://openrouter.ai/api/v1',
  maxTokens: 1000,
  temperature: 0.7,
};

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    provider = new OpenRouterProvider();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates instance with correct name', () => {
    expect(provider.name).toBe('openrouter');
  });

  describe('sendMessage', () => {
    it('returns content on success', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'Hello from GPT' } }] }),
          { status: 200 },
        ),
      );

      const result = await provider.sendMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ]);
      expect(result).toBe('Hello from GPT');
    });

    it('returns null on failure', async () => {
      mockFetch.mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      );

      const result = await provider.sendMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ]);
      expect(result).toBeNull();
    });
  });

  describe('sendStreamingMessage', () => {
    it('calls onChunk with content', async () => {
      const chunks: string[] = [];
      const onChunk = (chunk: { content: string; done: boolean }) => {
        if (chunk.content) chunks.push(chunk.content);
      };

      // Create a readable stream that emits SSE data
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue(
        new Response(stream, { status: 200 }),
      );

      await provider.sendStreamingMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ], onChunk);

      expect(chunks).toEqual(['Hello', ' World']);
    });

    it('handles rate limit (429)', async () => {
      const chunks: { content: string; done: boolean; error?: string }[] = [];
      const onChunk = (chunk: { content: string; done: boolean; error?: string }) => {
        chunks.push(chunk);
      };

      mockFetch.mockResolvedValue(
        new Response('Rate limited', { status: 429 }),
      );

      await provider.sendStreamingMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ], onChunk);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].done).toBe(true);
      expect(chunks[0].error).toContain('Rate limited');
    });
  });

  describe('testConnection', () => {
    it('fails without API key', async () => {
      const result = await provider.testConnection({
        ...mockConfig,
        apiKey: '',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('API key');
    });
  });
});
