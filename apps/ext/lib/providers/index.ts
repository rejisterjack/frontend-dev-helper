import type { LLMProvider } from './base-provider';
import { OpenRouterProvider } from './openrouter-provider';
import { OllamaProvider } from './ollama-provider';
import { FireworksProvider } from './fireworks-provider';
import { ZAIProvider } from './zai-provider';

const providers: Record<string, LLMProvider> = {
  openrouter: new OpenRouterProvider(),
  ollama: new OllamaProvider(),
  fireworks: new FireworksProvider(),
  zai: new ZAIProvider(),
};

export function getProvider(providerName: string): LLMProvider {
  return providers[providerName] ?? providers.openrouter;
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

export { type LLMProvider, type LLMProviderConfig, type StreamChunk } from './base-provider';
