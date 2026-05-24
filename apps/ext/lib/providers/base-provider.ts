import type { LLMMessage } from '../types';

export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface LLMProvider {
  readonly name: string;
  sendMessage(config: LLMProviderConfig, messages: LLMMessage[]): Promise<string | null>;
  sendStreamingMessage(
    config: LLMProviderConfig,
    messages: LLMMessage[],
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  testConnection(config: LLMProviderConfig): Promise<{ success: boolean; message: string }>;
}
