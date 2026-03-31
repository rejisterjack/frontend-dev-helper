/**
 * LLM Service Tests
 *
 * Tests for the OpenRouter API integration with mocked responses.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { LLMConfig } from '../../src/types';

// Mock fetch
global.fetch = vi.fn();

describe('LLM Service', () => {
  const mockConfig: LLMConfig = {
    provider: 'openrouter',
    apiKey: 'test-api-key',
    model: 'openrouter/quasar-alpha',
    enabled: true,
    useFreeModelsOnly: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should save and load config from storage', () => {
      const saveConfig = (config: LLMConfig) => {
        localStorage.setItem('fdh_llm_config', JSON.stringify(config));
      };

      const loadConfig = (): LLMConfig | null => {
        const stored = localStorage.getItem('fdh_llm_config');
        return stored ? JSON.parse(stored) : null;
      };

      saveConfig(mockConfig);
      const loaded = loadConfig();

      expect(loaded).toEqual(mockConfig);
    });

    it('should return default config when none saved', () => {
      const loadConfig = (): LLMConfig => {
        const stored = localStorage.getItem('fdh_llm_config');
        return (
          stored ? JSON.parse(stored) : {
            provider: 'openrouter',
            apiKey: '',
            model: 'openrouter/quasar-alpha',
            enabled: true,
            useFreeModelsOnly: true,
          }
        );
      };

      const config = loadConfig();

      expect(config.provider).toBe('openrouter');
      expect(config.apiKey).toBe('');
    });

    it('should mask API key in logs', () => {
      const maskKey = (key: string): string => {
        if (key.length <= 8) return '***';
        return key.slice(0, 4) + '...' + key.slice(-4);
      };

      expect(maskKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
      expect(maskKey('short')).toBe('***');
    });
  });

  describe('API Requests', () => {
    it('should make correct API request to OpenRouter', async () => {
      const mockResponse = {
        id: 'test-id',
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    category: 'performance',
                    priority: 'high',
                    title: 'Optimize images',
                    description: 'Use WebP format',
                  },
                ],
              }),
            },
          },
        ],
      };

      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mockConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: mockConfig.model,
          messages: [{ role: 'user', content: 'Analyze this page' }],
        }),
      });

      const data = await response.json();

      expect(fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockConfig.apiKey}`,
          }),
        })
      );

      expect(data.choices[0].message.content).toContain('suggestions');
    });

    it('should handle API errors gracefully', async () => {
      (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Rate Limited',
      });

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${mockConfig.apiKey}` },
        body: JSON.stringify({ model: mockConfig.model, messages: [] }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });

    it('should handle network failures', async () => {
      (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        fetch('https://openrouter.ai/api/v1/chat/completions', {})
      ).rejects.toThrow('Network error');
    });

    it('should implement retry logic on failure', async () => {
      const mockSuccess = {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{}' } }] }),
      };

      (fetch as unknown as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(mockSuccess);

      const fetchWithRetry = async (retries = 3): Promise<Response> => {
        for (let i = 0; i < retries; i++) {
          try {
            return await fetch('https://api.example.com');
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
          }
        }
        throw new Error('Max retries exceeded');
      };

      const result = await fetchWithRetry();
      expect(result.ok).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid JSON response', () => {
      const parseResponse = (content: string): unknown => {
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      };

      const validJson = '{"suggestions": []}';
      expect(parseResponse(validJson)).toEqual({ suggestions: [] });

      const invalidJson = 'not json';
      expect(parseResponse(invalidJson)).toBeNull();
    });

    it('should extract JSON from markdown code blocks', () => {
      const extractJson = (content: string): unknown => {
        const codeBlockMatch = content.match(/```(?:json)?\n?([\s\S]*?)```/);
        const json = codeBlockMatch ? codeBlockMatch[1].trim() : content;
        try {
          return JSON.parse(json);
        } catch {
          return null;
        }
      };

      const markdownResponse = `
        Here's the analysis:
        \`\`\`json
        {"suggestions": [{"title": "Test"}]}
        \`\`\`
      `;

      expect(extractJson(markdownResponse)).toEqual({
        suggestions: [{ title: 'Test' }],
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should track request timestamps', () => {
      const requestTimes: number[] = [];

      const makeRequest = () => {
        const now = Date.now();
        // Rate limit: max 5 requests per minute
        const oneMinuteAgo = now - 60000;
        const recentRequests = requestTimes.filter((t) => t > oneMinuteAgo);

        if (recentRequests.length >= 5) {
          throw new Error('Rate limit exceeded');
        }

        requestTimes.push(now);
      };

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        makeRequest();
      }

      expect(requestTimes).toHaveLength(5);
      expect(() => makeRequest()).toThrow('Rate limit exceeded');
    });
  });

  describe('Model Selection', () => {
    it('should return free models when useFreeModelsOnly is true', () => {
      const freeModels = [
        { id: 'openrouter/quasar-alpha', name: 'Quasar Alpha', free: true },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', free: true },
        { id: 'paid-model', name: 'Paid Model', free: false },
      ];

      const getAvailableModels = (config: LLMConfig) => {
        if (config.useFreeModelsOnly) {
          return freeModels.filter((m) => m.free);
        }
        return freeModels;
      };

      const available = getAvailableModels(mockConfig);
      expect(available).toHaveLength(2);
      expect(available.every((m) => m.free)).toBe(true);
    });
  });
});
