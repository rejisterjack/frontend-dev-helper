/**
 * LLM Service
 *
 * Handles communication with AI providers (OpenRouter) for AI-powered analysis.
 * Supports Bring Your Own Key (BYOK) model with user's own API key.
 *
 * Features:
 * - OpenRouter API integration with free-tier models
 * - Secure API key storage (chrome.storage.session) - not accessible to content scripts
 * - Request/response handling with error recovery
 * - Caching for repeated analysis of same pages
 * - Retry logic with exponential backoff
 * - Rate limit handling (HTTP 429)
 */

import { z } from 'zod';
import type {
  LLMConfig,
  LLMMessage,
  LLMPageContext,
  LLMRequest,
  LLMResponse,
  LLMSuggestion,
} from '@/types';
import { DEFAULT_LLM_CONFIG } from '@/types';
import { logger } from '@/utils/logger';

// ============================================
// Configuration
// ============================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const STORAGE_KEY = 'fdh_llm_config';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RATE_LIMIT_DELAY_MS = 60000; // 1 minute wait after 429

// Zod schema for LLM response validation
const SuggestionSchema = z.object({
  category: z.enum(['accessibility', 'performance', 'seo', 'best-practice', 'security']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  title: z.string(),
  description: z.string(),
  impact: z.string(),
  effort: z.enum(['easy', 'medium', 'hard']),
  element: z.string().optional(),
  selector: z.string().optional(),
  autoFixable: z.boolean(),
  suggestedFix: z.string().optional(),
});

const LLMResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

// ============================================
// State
// ============================================

let config: LLMConfig = { ...DEFAULT_LLM_CONFIG };
const analysisCache = new Map<string, { result: LLMSuggestion[]; timestamp: number }>();

// ============================================
// Configuration Management
// ============================================

/**
 * Load LLM configuration from storage (chrome.storage.session for security)
 * Session storage is cleared when browser closes and is NOT accessible to content scripts
 */
export async function loadConfig(): Promise<LLMConfig> {
  try {
    const result = await chrome.storage.session.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      config = { ...DEFAULT_LLM_CONFIG, ...result[STORAGE_KEY] };
    }
    return config;
  } catch (error) {
    logger.error('[LLMService] Failed to load config:', error);
    return config;
  }
}

/**
 * Save LLM configuration to storage (chrome.storage.session for security)
 */
export async function saveConfig(newConfig: Partial<LLMConfig>): Promise<void> {
  config = { ...config, ...newConfig };
  try {
    await chrome.storage.session.set({ [STORAGE_KEY]: config });
    logger.log('[LLMService] Config saved to session storage');
  } catch (error) {
    logger.error('[LLMService] Failed to save config:', error);
  }
}

/**
 * Get current configuration
 */
export function getConfig(): LLMConfig {
  return { ...config };
}

/**
 * Check if LLM is configured and enabled
 */
export function isLLMEnabled(): boolean {
  return config.enabled && !!config.apiKey;
}

// ============================================
// API Communication
// ============================================

/**
 * Send a request to the LLM API with retry logic and rate limit handling
 */
export async function sendRequest(messages: LLMMessage[]): Promise<LLMResponse | null> {
  if (!config.apiKey) {
    logger.warn('[LLMService] No API key configured');
    return null;
  }

  const request: LLMRequest = {
    model: config.model,
    messages,
    temperature: 0.3, // Lower temperature for more consistent analysis
    max_tokens: 2000,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': 'https://github.com/rejisterjack/frontend-dev-helper',
          'X-Title': 'FrontendDevHelper',
        },
        body: JSON.stringify(request),
      });

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        logger.warn('[LLMService] Rate limited, waiting before retry...');
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        continue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[LLMService] API error:', response.status, errorData);

        // Retry on server errors (5xx) but not client errors (4xx)
        if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt));
          continue;
        }

        return null;
      }

      // Check Content-Type header
      const contentType = response.headers.get('Content-Type');
      if (!contentType?.includes('application/json')) {
        logger.warn('[LLMService] Unexpected response content type:', contentType);
        return null;
      }

      const data: LLMResponse = await response.json();
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(
        `[LLMService] Request failed (attempt ${attempt + 1}/${MAX_RETRIES}):`,
        lastError
      );

      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * 2 ** attempt));
      }
    }
  }

  logger.error('[LLMService] All retry attempts failed:', lastError);
  return null;
}

// ============================================
// Page Analysis
// ============================================

/**
 * Analyze a page using LLM
 * Returns AI suggestions based on the page content
 */
export async function analyzePage(context: LLMPageContext): Promise<LLMSuggestion[] | null> {
  // Check cache first
  const cacheKey = `${context.url}:${context.domStats.totalElements}`;
  const cached = analysisCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    logger.log('[LLMService] Returning cached analysis');
    return cached.result;
  }

  if (!isLLMEnabled()) {
    logger.log('[LLMService] LLM not enabled, skipping analysis');
    return null;
  }

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content: `You are a frontend development expert analyzing web pages for accessibility, performance, SEO, and best practice issues.

Provide analysis in JSON format with the following structure:
{
  "suggestions": [
    {
      "category": "accessibility" | "performance" | "seo" | "best-practice" | "security",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "impact": "Why this matters for users/developers",
      "effort": "easy" | "medium" | "hard",
      "element": "HTML element type (optional)",
      "selector": "CSS selector hint (optional)",
      "autoFixable": boolean,
      "suggestedFix": "Description of how to fix (optional)"
    }
  ]
}

Focus on actionable, high-impact issues. Be specific and practical. Limit to 5-10 most important suggestions.`,
    },
    {
      role: 'user',
      content: `Analyze this web page and provide suggestions:

URL: ${context.url}
Title: ${context.title}
Meta Description: ${context.meta.description || 'None'}
Viewport: ${context.meta.viewport || 'Not set'}

Tech Stack Detected: ${context.techStack.join(', ') || 'Unknown'}

DOM Statistics:
- Total Elements: ${context.domStats.totalElements}
- Images: ${context.domStats.images}
- Links: ${context.domStats.links}
- Headings: ${context.domStats.headings}

Provide your analysis as JSON.`,
    },
  ];

  const response = await sendRequest(messages);
  if (!response) return null;

  try {
    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/```\n?([\s\S]*?)\n?```/) || [null, content];

    const jsonStr = jsonMatch[1] || content;
    const parsed = JSON.parse(jsonStr.trim());

    // Validate with Zod schema
    const validated = LLMResponseSchema.safeParse(parsed);
    if (!validated.success) {
      logger.error('[LLMService] LLM response validation failed:', validated.error);
      return null;
    }

    const suggestions = validated.data.suggestions;

    // Cache the result
    analysisCache.set(cacheKey, {
      result: suggestions,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    cleanupCache();

    return suggestions;
  } catch (error) {
    logger.error('[LLMService] Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * Clean up old cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, entry] of analysisCache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION_MS) {
      analysisCache.delete(key);
    }
  }
}

// ============================================
// Quick Analysis
// ============================================

/**
 * Quick analysis of specific elements or issues
 */
export async function analyzeElement(
  elementHtml: string,
  elementType: string
): Promise<string | null> {
  if (!isLLMEnabled()) return null;

  const messages: LLMMessage[] = [
    {
      role: 'system',
      content:
        'You are a frontend expert providing quick, actionable feedback on HTML elements. Be concise (1-2 sentences).',
    },
    {
      role: 'user',
      content: `Analyze this ${elementType} element and suggest improvements:\n\n${elementHtml}`,
    },
  ];

  const response = await sendRequest(messages);
  return response?.choices[0]?.message?.content || null;
}

// ============================================
// Export
// ============================================

export const llmService = {
  loadConfig,
  saveConfig,
  getConfig,
  isLLMEnabled,
  sendRequest,
  analyzePage,
  analyzeElement,
};

export default llmService;
