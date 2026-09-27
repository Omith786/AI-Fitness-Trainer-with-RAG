import type { RetrievalConfig } from "../config.js";
import type { LlmClient, LlmMessage } from "../llm/client.js";
import type { ChatEvent, ChatMessage, Citation, RetrievedChunk } from "../types.js";
import type { HybridRetriever } from "./retriever.js";

const SNIPPET_LENGTH = 220;

const SYSTEM_PREAMBLE = `You are a knowledgeable, encouraging personal fitness trainer.
Answer the user's question using ONLY the numbered sources provided below.
Cite the sources you rely on inline using their bracketed numbers, for example [1] or [2].
If the sources do not cover the question, say so plainly and suggest what a qualified professional could help with, rather than inventing details.
Keep answers practical, well structured and concise. Use short paragraphs or bullet points.
You are not a medical professional: for injuries, medical conditions, pregnancy or medication, advise the user to consult a qualified healthcare provider.`;

/**
 * End-to-end retrieval-augmented generation for the fitness trainer.
 *
 * A single call retrieves grounding chunks, streams them to the client as
 * citations, then streams the language model's grounded answer token by token.
 */
export class RagPipeline {
  private readonly retriever: HybridRetriever;
  private readonly llm: LlmClient;
  private readonly retrieval: RetrievalConfig;

  constructor(retriever: HybridRetriever, llm: LlmClient, retrieval: RetrievalConfig) {
    this.retriever = retriever;
    this.llm = llm;
    this.retrieval = retrieval;
  }

  /** Build the citation list shown to the user from retrieved chunks. */
  private toCitations(retrieved: RetrievedChunk[]): Citation[] {
    return retrieved.map((hit, index) => ({
      marker: index + 1,
      title: hit.chunk.title,
      source: hit.chunk.source,
      snippet: truncate(hit.chunk.text, SNIPPET_LENGTH),
      score: hit.score,
    }));
  }

  private buildMessages(
    question: string,
    retrieved: RetrievedChunk[],
    history: ChatMessage[],
  ): LlmMessage[] {
    const context = retrieved
      .map((hit, index) => `[${index + 1}] ${hit.chunk.title}\n${hit.chunk.text}`)
      .join("\n\n");

    const systemContent =
      retrieved.length > 0
        ? `${SYSTEM_PREAMBLE}\n\nSources:\n${context}`
        : `${SYSTEM_PREAMBLE}\n\nSources:\n(No relevant sources were found in the knowledge base.)`;

    // Keep only the most recent turns to stay within a small model's context.
    const recentHistory = history.slice(-6).map<LlmMessage>((m) => ({
      role: m.role,
      content: m.content,
    }));

    return [
      { role: "system", content: systemContent },
      ...recentHistory,
      { role: "user", content: question },
    ];
  }

  /**
   * Answer a question as a stream of events: citations first, then answer
   * tokens, then a terminal done/error event.
   */
  async *answer(question: string, history: ChatMessage[] = []): AsyncGenerator<ChatEvent> {
    const trimmed = question.trim();
    if (trimmed.length === 0) {
      yield { type: "error", message: "Please enter a question." };
      return;
    }

    try {
      const retrieved = await this.retriever.retrieve(trimmed, {
        candidatesPerRetriever: this.retrieval.candidatesPerRetriever,
        topK: this.retrieval.topK,
      });
      const citations = this.toCitations(retrieved);
      yield { type: "sources", citations };

      const messages = this.buildMessages(trimmed, retrieved, history);
      for await (const token of this.llm.streamChat(messages)) {
        yield { type: "token", text: token };
      }
      yield { type: "done" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error generating answer.";
      yield { type: "error", message };
    }
  }
}

function truncate(text: string, maxLength: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength).trimEnd()}...`;
}
