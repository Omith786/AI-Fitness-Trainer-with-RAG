import type { LlmClient, LlmMessage } from "./client.js";

/**
 * Deterministic in-memory client used by tests and offline demos. It never
 * touches the network, so the RAG pipeline and API can be tested without a
 * running model. The reply is derived from the prompt so tests can assert that
 * retrieved context actually reaches the language model.
 */
export class FakeLlmClient implements LlmClient {
  private readonly responder: (messages: LlmMessage[]) => string;

  constructor(responder?: (messages: LlmMessage[]) => string) {
    this.responder = responder ?? defaultResponder;
  }

  async *streamChat(messages: LlmMessage[]): AsyncIterable<string> {
    const reply = this.responder(messages);
    // Emit word by word to exercise the streaming code path.
    const words = reply.split(" ");
    for (let i = 0; i < words.length; i++) {
      yield i === 0 ? words[i] : ` ${words[i]}`;
    }
  }
}

function defaultResponder(messages: LlmMessage[]): string {
  const question = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const cited = /\[(\d+)\]/.exec(messages.find((m) => m.role === "system")?.content ?? "");
  const marker = cited ? cited[0] : "[1]";
  return `Based on the provided sources ${marker}, here is guidance for: ${question.trim()}`;
}
