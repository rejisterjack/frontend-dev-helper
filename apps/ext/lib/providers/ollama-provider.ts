import type { LLMMessage } from "../types";
import type {
  LLMProvider,
  LLMProviderConfig,
  StreamChunk,
} from "./base-provider";

const DEFAULT_BASE_URL = "http://localhost:11434";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";

  async sendMessage(
    config: LLMProviderConfig,
    messages: LLMMessage[],
    signal?: AbortSignal,
  ): Promise<string | null> {
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    const url = `${baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens,
          },
        }),
        signal,
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.message?.content ?? null;
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
    const url = `${baseUrl}/api/chat`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          stream: true,
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens,
          },
        }),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        onChunk({
          content: "",
          done: true,
          error: `Ollama error: ${response.status} ${errorBody}`,
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
          if (!trimmed) continue;
          try {
            const json = JSON.parse(trimmed);
            if (json.message?.content) {
              onChunk({ content: json.message.content, done: false });
            }
            if (json.done) {
              onChunk({ content: "", done: true });
              return;
            }
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
    const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

    try {
      const response = await fetch(`${baseUrl}/api/tags`);

      if (!response.ok) {
        return {
          success: false,
          message: `Ollama returned status ${response.status}.`,
        };
      }

      const data = await response.json();
      const modelNames: string[] = (data.models ?? []).map(
        (m: { name: string }) => m.name,
      );

      if (modelNames.length === 0) {
        return {
          success: false,
          message:
            "Connected to Ollama, but no models are installed. Run `ollama pull llama3` to install a model.",
        };
      }

      const modelAvailable =
        modelNames.includes(config.model) ||
        modelNames.some((n) => n.startsWith(config.model));
      if (modelAvailable || !config.model) {
        return {
          success: true,
          message: `Connected to Ollama. Available models: ${modelNames.join(", ")}`,
        };
      }

      return {
        success: true,
        message: `Connected to Ollama, but model "${config.model}" not found. Available: ${modelNames.join(", ")}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Cannot connect to Ollama at ${baseUrl}. Make sure Ollama is running. Error: ${error instanceof Error ? error.message : "Unknown"}`,
      };
    }
  }
}
