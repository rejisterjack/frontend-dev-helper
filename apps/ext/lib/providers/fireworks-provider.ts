import type { LLMMessage } from "../types";
import type {
  LLMProvider,
  LLMProviderConfig,
  StreamChunk,
} from "./base-provider";

const DEFAULT_BASE_URL = "https://api.fireworks.ai/inference/v1";

const FIREWORKS_MODELS = [
  // Free tier
  {
    id: "accounts/fireworks/models/llama4-scout-instruct-basic",
    label: "Llama 4 Scout",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/llama-v3p3-70b-instruct",
    label: "Llama 3.3 70B",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/deepseek-v3",
    label: "DeepSeek V3",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/qwen2p5-72b-instruct",
    label: "Qwen 2.5 72B",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/mixtral-8x7b-instruct",
    label: "Mixtral 8x7B",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/qwen3-235b-instruct",
    label: "Qwen3 235B",
    tier: "free",
  },
  {
    id: "accounts/fireworks/models/gemma-3-27b-it",
    label: "Gemma 3 27B",
    tier: "free",
  },
  // Paid tier
  {
    id: "accounts/fireworks/models/llama4-maverick-instruct-basic",
    label: "Llama 4 Maverick",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/deepseek-v3-1226",
    label: "DeepSeek V3 (Latest)",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/kimi-k2-instruct-0905",
    label: "Kimi K2",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/qwen3-32b-instruct",
    label: "Qwen3 32B",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/llama-v3p1-405b-instruct",
    label: "Llama 3.1 405B",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/llama-v3p1-8b-instruct",
    label: "Llama 3.1 8B",
    tier: "paid",
  },
  {
    id: "accounts/fireworks/models/mistral-7b-instruct-v0p3",
    label: "Mistral 7B v0.3",
    tier: "paid",
  },
] as const;

export { FIREWORKS_MODELS };

export class FireworksProvider implements LLMProvider {
  readonly name = "fireworks";

  async sendMessage(
    config: LLMProviderConfig,
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): Promise<string | null> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/chat/completions`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
        signal,
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        const errorBody = await response.text().catch(() => "");
        onChunk({
          content: "",
          done: true,
          error: `Fireworks API error ${response.status}: ${errorBody}`,
        });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onChunk({ content: "", done: true, error: "No response body" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal?.aborted) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (
            !trimmed ||
            trimmed === "data: [DONE]" ||
            !trimmed.startsWith("data: ")
          )
            continue;
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) onChunk({ content, done: false });
          } catch {
            /* skip malformed chunks */
          }
        }
      }
      onChunk({ content: "", done: true });
    } catch (error) {
      if (signal?.aborted) return;
      onChunk({
        content: "",
        done: true,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async testConnection(
    config: LLMProviderConfig,
  ): Promise<{ success: boolean; message: string }> {
    if (!config.apiKey) {
      return {
        success: false,
        message: "API key is required. Get one free at fireworks.ai",
      };
    }

    try {
      const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: `Connected to Fireworks (model: ${config.model})`,
        };
      }

      const errorBody = await response.text().catch(() => "");
      return {
        success: false,
        message: `API error ${response.status}: ${errorBody}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection failed.",
      };
    }
  }
}
