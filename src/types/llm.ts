/**
 * FrontendDevHelper - LLM / AI Provider Types
 *
 * Types for LLM configuration, requests, responses, and AI suggestions.
 */

// ============================================
// AI Suggestion Types
// ============================================

/** AI suggestion category */
export type AISuggestionCategory =
  | 'accessibility'
  | 'performance'
  | 'seo'
  | 'best-practice'
  | 'security';

/** AI suggestion priority */
export type AISuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

/** AI suggestion item */
export interface AISuggestion {
  id: string;
  category: AISuggestionCategory;
  priority: AISuggestionPriority;
  title: string;
  description: string;
  element?: string;
  selector?: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  confidence: number;
  autoFixable: boolean;
  fix?: () => boolean | Promise<boolean>;
}

/** AI analysis result */
export interface AIAnalysisResult {
  timestamp: number;
  url: string;
  suggestions: AISuggestion[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    autoFixable: number;
    byCategory: Record<AISuggestionCategory, number>;
  };
}

// ============================================
// LLM / AI Provider Types
// ============================================

/** AI provider type */
export type AIProvider = 'openrouter' | 'custom';

/** LLM configuration */
export interface LLMConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
  useFreeModelsOnly: boolean;
  categories?: {
    accessibility: boolean;
    performance: boolean;
    seo: boolean;
    bestPractice: boolean;
    security: boolean;
  };
}

/** LLM request message */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** LLM request payload */
export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/** LLM response choice */
export interface LLMChoice {
  index: number;
  message: LLMMessage;
  finish_reason: string;
}

/** LLM API response */
export interface LLMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** LLM suggestion from AI analysis */
export interface LLMSuggestion {
  category: AISuggestionCategory;
  priority: AISuggestionPriority;
  title: string;
  description: string;
  impact: string;
  effort: 'easy' | 'medium' | 'hard';
  element?: string;
  selector?: string;
  autoFixable: boolean;
  suggestedFix?: string;
}

/** Page context for LLM analysis */
export interface LLMPageContext {
  url: string;
  title: string;
  meta: {
    description?: string;
    viewport?: string;
  };
  techStack: string[];
  domStats: {
    totalElements: number;
    images: number;
    links: number;
    headings: number;
  };
}

/** Default LLM configuration */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'openrouter',
  apiKey: '',
  model: 'openrouter/quasar-alpha',
  enabled: true,
  useFreeModelsOnly: true,
};

/** Available OpenRouter models (free tier) */
export const OPENROUTER_FREE_MODELS = [
  {
    id: 'openrouter/quasar-alpha',
    name: 'Quasar Alpha (Free)',
    description: "OpenRouter's free model",
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    description: "Google's fast multimodal model",
  },
  {
    id: 'deepseek/deepseek-chat:free',
    name: 'DeepSeek V3 (Free)',
    description: "DeepSeek's chat model",
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B (Free)',
    description: "Meta's large instruction model",
  },
];
