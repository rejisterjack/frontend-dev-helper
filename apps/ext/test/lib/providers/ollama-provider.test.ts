import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from '@/lib/providers/ollama-provider';
import type { LLMProviderConfig } from '@/lib/providers/base-provider';

const mockConfig: LLMProviderConfig = {
  apiKey: '',
  model: 'llama3',
  baseUrl: 'http://localhost:11434',
  maxTokens: 1000,
  temperature: 0.7,
};

describe('OllamaProvider', () => {
  let provider: OllamaProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaProvider();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it('creates instance with correct name', () => {
    expect(provider.name).toBe('ollama');
  });

  describe('sendMessage', () => {
    it('posts to /api/chat', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ message: { content: 'Hello from Ollama' } }),
          { status: 200 },
        ),
      );

      const result = await provider.sendMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(result).toBe('Hello from Ollama');
    });
  });

  describe('sendStreamingMessage', () => {
    it('parses NDJSON correctly', async () => {
      const chunks: { content: string; done: boolean }[] = [];
      const onChunk = (chunk: { content: string; done: boolean }) => {
        chunks.push(chunk);
      };

      // NDJSON: newline-delimited JSON, Ollama format
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('{"message":{"content":"Hello "}}\n'));
          controller.enqueue(encoder.encode('{"message":{"content":"World"}}\n'));
          controller.enqueue(encoder.encode('{"done":true}\n'));
          controller.close();
        },
      });

      mockFetch.mockResolvedValue(
        new Response(stream, { status: 200 }),
      );

      await provider.sendStreamingMessage(mockConfig, [
        { role: 'user', content: 'Hi' },
      ], onChunk);

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[0].content).toBe('Hello ');
      expect(chunks[1].content).toBe('World');
    });
  });

  describe('testConnection', () => {
    it('returns available models', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ models: [{ name: 'llama3' }, { name: 'mistral' }] }),
          { status: 200 },
        ),
      );

      const result = await provider.testConnection(mockConfig);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Available models');
      expect(result.message).toContain('llama3');
    });

    it('reports when Ollama is not running', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await provider.testConnection(mockConfig);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot connect');
    });
  });
});
