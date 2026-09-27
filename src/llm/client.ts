import OpenAI from "openai";
import type { LlmConfig } from "../config.js";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Minimal streaming chat interface. Kept provider-agnostic so the default local
 * Ollama server, hosted OpenAI-compatible endpoints (Groq, Together, ...) and a
 * test fake can all satisfy the same contract.
 */
export interface LlmClient {
  streamChat(messages: LlmMessage[]): AsyncIterable<string>;
}

/**
 * Talks to any OpenAI-compatible chat completions endpoint. Ollama exposes one
 * at http://localhost:11434/v1, which is the default in config.
 */
export class OpenAICompatibleClient implements LlmClient {
  private readonly client: OpenAI;
  private readonly config: LlmConfig;

  constructor(config: LlmConfig) {
    this.config = config;
    this.client = new OpenAI({ baseURL: config.baseUrl, apiKey: config.apiKey });
  }

  async *streamChat(messages: LlmMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream: true,
    });
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
