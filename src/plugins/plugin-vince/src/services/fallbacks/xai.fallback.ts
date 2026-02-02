/**
 * XAI Fallback Service
 *
 * Provides direct xAI API access when plugin-xai is not available.
 * Implements the XAIService interface for Grok model access.
 *
 * API: https://api.x.ai/v1 (OpenAI-compatible)
 * Auth: Requires XAI_API_KEY
 */

import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";

const XAI_BASE_URL = "https://api.x.ai/v1";
const DEFAULT_MODEL = "grok-3-mini-fast";
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes for long responses

/**
 * Response from generateText
 */
export interface IXAIGenerateTextResult {
  success: boolean;
  text: string;
  error?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens: number;
  };
}

/**
 * Interface matching the XAI service from plugin-xai
 */
export interface IXAIService {
  isConfigured(): boolean;
  generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): Promise<IXAIGenerateTextResult>;
}

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class XAIFallbackService implements IXAIService {
  private apiKey: string | null = null;
  private runtime: IAgentRuntime | null = null;

  constructor(runtime?: IAgentRuntime) {
    if (runtime) {
      this.runtime = runtime;
      this.apiKey = runtime.getSetting("XAI_API_KEY") as string | null;
    }
    logger.debug(`[XAIFallback] Fallback service initialized (API key: ${this.apiKey ? "yes" : "no"})`);
  }

  /**
   * Check if the service is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate text using the xAI API (OpenAI-compatible)
   */
  async generateText(params: {
    prompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    system?: string;
  }): Promise<IXAIGenerateTextResult> {
    if (!this.apiKey) {
      return {
        success: false,
        text: "",
        error: "XAI_API_KEY not configured",
      };
    }

    const { prompt, model, temperature, maxTokens, system } = params;

    // Build messages array
    const messages: ChatCompletionMessage[] = [];

    if (system) {
      messages.push({
        role: "system",
        content: system,
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${XAI_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        let errorMsg = `xAI API error ${response.status}: ${errorText}`;
        if (response.status === 401) {
          errorMsg = "Invalid XAI_API_KEY";
        } else if (response.status === 429) {
          errorMsg = "xAI rate limit exceeded";
        } else if (response.status === 503) {
          errorMsg = "xAI service temporarily unavailable";
        }
        
        return {
          success: false,
          text: "",
          error: errorMsg,
        };
      }

      const data = (await response.json()) as ChatCompletionResponse;

      if (!data.choices || data.choices.length === 0) {
        return {
          success: false,
          text: "",
          error: "No response from xAI API",
        };
      }

      const content = data.choices[0].message.content;

      if (data.usage) {
        logger.debug(
          `[XAIFallback] Generated ${data.usage.completion_tokens} tokens ` +
          `(prompt: ${data.usage.prompt_tokens}, total: ${data.usage.total_tokens})`
        );
      }

      return {
        success: true,
        text: content,
        usage: data.usage ? {
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : String(error);
      if (error instanceof Error && error.name === "AbortError") {
        errorMsg = "xAI request timed out after 2 minutes";
      }
      
      return {
        success: false,
        text: "",
        error: errorMsg,
      };
    }
  }
}
